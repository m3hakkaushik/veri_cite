"""Real storage -> signed job -> persisted citations/evidence/progress smoke."""

import asyncio
import hashlib
import hmac
import json
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.db import create_worker_client

BIB = """@inproceedings{vaswani2017,
 title={Attention Is All You Need}, author={Vaswani, Ashish and Shazeer, Noam},
 year={2017}, booktitle={NeurIPS}, eprint={1706.03762}, archivePrefix={arXiv}}
@article{ghost, title={Graph Priors for Recall}, year={2022},
 eprint={2305.XXXX}, archivePrefix={arXiv}}
@inproceedings{wrongyear, title={Attention Is All You Need},
 author={Vaswani, Ashish and Shazeer, Noam}, year={2018}, booktitle={NeurIPS}}
"""


async def main():
    db = await create_worker_client()
    run_id = str(uuid4())
    owner = "user_pipeline_smoke"
    path = f"{owner}/{run_id}/smoke.bib"
    try:
        await db.table("users").upsert({"id": owner, "name": "Controlled pipeline smoke"}).execute()
        await db.storage.from_("uploads").upload(
            path, BIB.encode(), file_options={"content-type": "text/plain"}
        )
        await (
            db.table("runs")
            .insert(
                {
                    "id": run_id,
                    "owner_id": owner,
                    "title": "Controlled live existence smoke",
                    "input_type": "bib",
                    "source_storage_path": path,
                }
            )
            .execute()
        )
        stamp = str(int(time.time()))
        body = b"{}"
        signature = hmac.new(
            get_settings().worker_shared_secret.get_secret_value().encode(),
            stamp.encode() + b"." + body,
            hashlib.sha256,
        ).hexdigest()
        async with httpx.AsyncClient() as http:
            response = await http.post(
                f"http://localhost:8000/internal/runs/{run_id}/start",
                content=body,
                headers={"X-VeriCite-Timestamp": stamp, "X-VeriCite-Signature": signature},
            )
        assert response.status_code == 202
        print("Started real run", run_id, flush=True)
        for _ in range(120):
            run = (
                await db.table("runs")
                .select("status,checked_citations,tinyfish_usage,trust_score")
                .eq("id", run_id)
                .single()
                .execute()
            ).data
            if run["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(1)
        assert run["status"] == "completed", run["status"]
        rows = (
            await db.table("citations")
            .select("id,idx,status,existence,field_diffs")
            .eq("run_id", run_id)
            .order("idx")
            .execute()
        ).data
        print(json.dumps({"run": run, "citations": rows}, indent=2), flush=True)
        assert [r["status"] for r in rows] == ["verified", "not_found", "needs_review"]
        evidence = (
            await db.table("evidence")
            .select("citation_id,source_url,api")
            .eq("run_id", run_id)
            .execute()
        ).data
        assert all(
            any(e["citation_id"] == row["id"] and e["source_url"] for e in evidence) for row in rows
        )
        assert run["checked_citations"] == 3
        print(
            "PASS persisted live verdicts, linked evidence, storage, signing, progress and usage",
            flush=True,
        )
    finally:
        # Keep this private actual run for inspection; never mark test inputs is_sample.
        await db.postgrest.aclose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(
            f"FAIL pipeline smoke: {type(error).__name__}, "
            f"HTTP {getattr(error, 'status_code', 'n/a')}"
        )
        raise SystemExit(1) from None
