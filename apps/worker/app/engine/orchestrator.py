"""Single-process async jobs; all report state is persisted in Supabase."""

import asyncio
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from supabase import AsyncClient

from app.checks.exists import ExistenceChecker
from app.clients.common import bounded_raw
from app.clients.llm import GeminiProvider
from app.clients.tinyfish import TinyFishGateway
from app.clients.usage import UsageRecorder
from app.config import Settings, get_settings
from app.db import create_worker_client
from app.engine.verdict import rollup, summarize
from app.models import ParsedDocument
from app.parsing.bib import parse_bib
from app.parsing.pdf import parse_pdf
from app.parsing.text import parse_text

logger = logging.getLogger(__name__)


@dataclass
class Runtime:
    db: AsyncClient
    usage: UsageRecorder
    gateway: TinyFishGateway
    llm: GeminiProvider
    settings: Settings


_runtime: Runtime | None = None
_runtime_lock = asyncio.Lock()
_tasks: dict[str, asyncio.Task] = {}


async def get_runtime() -> Runtime:
    global _runtime
    async with _runtime_lock:
        if _runtime is None:
            db = await create_worker_client()
            usage = UsageRecorder(db)
            settings = get_settings()
            _runtime = Runtime(
                db,
                usage,
                TinyFishGateway(settings, usage),
                GeminiProvider(settings, usage),
                settings,
            )
        return _runtime


async def close_runtime() -> None:
    global _runtime
    for task in _tasks.values():
        task.cancel()
    await asyncio.gather(*_tasks.values(), return_exceptions=True)
    if _runtime:
        await _runtime.gateway.close()
        await _runtime.llm.close()
        await _runtime.db.postgrest.aclose()
        _runtime = None


async def enqueue_run(run_id: str) -> None:
    try:
        UUID(run_id)
    except ValueError:
        raise HTTPException(
            404, detail={"code": "not_found", "message": "Run not found."}
        ) from None
    runtime = await get_runtime()
    response = (
        await runtime.db.table("runs").select("id,status").eq("id", run_id).limit(1).execute()
    )
    if not response.data:
        raise HTTPException(404, detail={"code": "not_found", "message": "Run not found."})
    if run_id in _tasks or response.data[0]["status"] != "queued":
        return
    task = asyncio.create_task(run_pipeline(run_id, runtime))
    _tasks[run_id] = task
    task.add_done_callback(lambda _: _tasks.pop(run_id, None))


async def run_pipeline(run_id: str, runtime: Runtime) -> None:
    db, settings, gateway = runtime.db, runtime.settings, runtime.gateway
    try:
        claimed = (
            await db.table("runs")
            .update(
                {
                    "status": "parsing",
                    "started_at": datetime.now(UTC).isoformat(),
                    "stage_detail": "Reading references and citation markers",
                }
            )
            .eq("id", run_id)
            .eq("status", "queued")
            .execute()
        )
        if not claimed.data:
            return
        run = claimed.data[0]
        if run["input_type"] == "bib":
            data = await db.storage.from_("uploads").download(run["source_storage_path"])
            document = ParsedDocument(references=parse_bib(data.decode("utf-8-sig")))
        elif run["input_type"] == "text":
            document = await parse_text(
                run["source_text"] or "", runtime.llm, settings, run_id=run_id
            )
        elif run["input_type"] == "pdf":
            document = await parse_pdf(
                run["source_storage_path"], db, runtime.llm, settings, run_id=run_id
            )
        else:
            raise ValueError("URL input is not enabled yet")
        refs = document.references
        if not refs:
            await (
                db.table("runs")
                .update(
                    {
                        "status": "completed",
                        "stage_detail": "No bibliography references found.",
                        "completed_at": datetime.now(UTC).isoformat(),
                        "trust_score": None,
                    }
                )
                .eq("id", run_id)
                .execute()
            )
            return
        result = (
            await db.table("citations")
            .insert(
                [
                    {
                        "run_id": run_id,
                        "idx": ref.idx,
                        "bib_key": ref.key,
                        "raw": ref.raw,
                        "parsed": ref.model_dump(mode="json"),
                    }
                    for ref in refs
                ]
            )
            .execute()
        )
        citations = {row["idx"]: row for row in result.data}
        claims = [
            {
                "run_id": run_id,
                "citation_id": citations[idx]["id"] if idx else None,
                "text": claim.text,
                "context": claim.context,
                "is_time_sensitive": claim.is_time_sensitive,
            }
            for claim in document.claims
            for idx in claim.citation_idxs or [None]
        ]
        if claims:
            await db.table("claims").insert(claims).execute()
        await (
            db.table("runs")
            .update(
                {
                    "status": "checking",
                    "total_citations": len(refs),
                    "stage_detail": f"Parsed {len(refs)} references; searching scholarly sources",
                }
            )
            .eq("id", run_id)
            .execute()
        )
        checker = ExistenceChecker(db, gateway, settings)
        slots = asyncio.Semaphore(settings.citation_concurrency)

        async def check(ref):
            async with slots:
                row = citations[ref.idx]
                await (
                    db.table("citations")
                    .update({"status": "checking"})
                    .eq("id", row["id"])
                    .execute()
                )
                try:
                    result = await checker.check(ref, run_id)
                    has_claims = any(ref.idx in claim.citation_idxs for claim in document.claims)
                    support = "unverifiable" if has_claims else "not_applicable"
                    status = rollup(result.existence, support, "unknown", has_claims=has_claims)
                    await (
                        db.table("evidence")
                        .insert(
                            [
                                {
                                    **e,
                                    "raw": bounded_raw(e.get("raw", {})),
                                    "run_id": run_id,
                                    "citation_id": row["id"],
                                }
                                for e in result.evidence
                            ]
                        )
                        .execute()
                    )
                    await (
                        db.table("citations")
                        .update(
                            {
                                "existence": result.existence,
                                "support": support,
                                "integrity": "unknown",
                                "status": status,
                                "reason": result.reason,
                                "matched": result.matched,
                                "field_diffs": result.field_diffs,
                                "cache_key": result.cache_key,
                            }
                        )
                        .eq("id", row["id"])
                        .execute()
                    )
                except Exception as error:
                    logger.warning(
                        "citation_check_failed run_id=%s citation_id=%s error_type=%s",
                        run_id,
                        row["id"],
                        type(error).__name__,
                    )
                    await (
                        db.table("citations")
                        .update(
                            {
                                "status": "error",
                                "existence": "error",
                                "reason": "Could not complete the live scholarly lookup.",
                            }
                        )
                        .eq("id", row["id"])
                        .execute()
                    )
                await db.rpc("increment_checked", {"p_run": run_id}).execute()

        await asyncio.gather(*(check(ref) for ref in refs))
        rows = await db.table("citations").select("status").eq("run_id", run_id).execute()
        counts, trust = summarize([row["status"] for row in rows.data])
        await runtime.usage.flush(run_id, force=True)
        await (
            db.table("runs")
            .update(
                {
                    "status": "completed",
                    "counts": counts,
                    "trust_score": trust,
                    "stage_detail": (
                        "Existence checks complete. Claim support and integrity "
                        "checks are not connected yet."
                    ),
                    "completed_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", run_id)
            .execute()
        )
    except asyncio.CancelledError:
        await (
            db.table("runs")
            .update(
                {
                    "status": "failed",
                    "error": "Worker restarted. Start a new check.",
                    "completed_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", run_id)
            .execute()
        )
        raise
    except Exception as error:
        logger.error("run_failed run_id=%s error_type=%s", run_id, type(error).__name__)
        await (
            db.table("runs")
            .update(
                {
                    "status": "failed",
                    "error": "Could not process this document. Check its format or retry.",
                    "completed_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", run_id)
            .execute()
        )
