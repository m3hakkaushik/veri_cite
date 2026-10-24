"""Live scholarly lookup with identifier guards and shared canonical cache."""

import hashlib
from datetime import UTC, datetime, timedelta
from urllib.parse import quote_plus

from pydantic import BaseModel, Field
from rapidfuzz import fuzz
from supabase import AsyncClient

from app.clients.tinyfish import EXISTS_PURPOSE, TinyFishGateway
from app.config import Settings
from app.engine.matching import field_diffs, norm, score
from app.models import FetchedPage, PaperHit, ParsedRef
from app.parsing.identifiers import identifier_error, implausible_year, normalize_arxiv


class ExistenceResult(BaseModel):
    existence: str
    reason: str
    matched: dict | None = None
    field_diffs: list[dict] = Field(default_factory=list)
    cache_key: str | None = None
    evidence: list[dict] = Field(default_factory=list)


def cache_key(ref: ParsedRef) -> str:
    if ref.doi:
        return "doi:" + ref.doi.lower()
    if ref.arxiv_id:
        return "arxiv:" + normalize_arxiv(ref.arxiv_id)
    return (
        "title:"
        + hashlib.sha1((norm(ref.title or ref.raw) + str(ref.year or "")).encode()).hexdigest()
    )


class ExistenceChecker:
    def __init__(self, db: AsyncClient, gateway: TinyFishGateway, settings: Settings):
        self.db, self.gateway, self.settings = db, gateway, settings

    async def check(self, ref: ParsedRef, run_id: str) -> ExistenceResult:
        invalid = identifier_error(doi=ref.doi, arxiv_id=ref.arxiv_id)
        if invalid:
            url = ref.url or (
                f"https://arxiv.org/abs/{normalize_arxiv(ref.arxiv_id)}"
                if ref.arxiv_id
                else f"https://doi.org/{ref.doi}"
            )
            return ExistenceResult(
                existence="not_found",
                reason=invalid,
                evidence=[
                    {
                        "check_type": "identifier",
                        "verdict": "not_found",
                        "api": "none",
                        "source_url": url,
                        "explanation": invalid + "; no network request was made.",
                        "raw": {"doi": ref.doi, "arxiv_id": ref.arxiv_id},
                    }
                ],
            )
        key = cache_key(ref)
        since = (datetime.now(UTC) - timedelta(days=self.settings.cache_ttl_days)).isoformat()
        cached = (
            await self.db.table("reference_cache")
            .select("canonical")
            .eq("key", key)
            .gte("fetched_at", since)
            .limit(1)
            .execute()
        )
        evidence = []
        if cached.data:
            hits = [PaperHit.model_validate(cached.data[0]["canonical"])]
            await self.gateway.usage.record(
                provider="tinyfish", api="search", run_id=run_id, units=0, cache_hit=True
            )
        else:
            hits = await self.gateway.search_papers(
                ref.title or ref.raw[:200], None if implausible_year(ref.year) else ref.year, run_id
            )
        best = max(hits[:5], key=lambda h: score(ref, h)["composite"], default=None)
        valid = best is not None and self._candidate(ref, best)
        if not valid:
            fallback = await self.gateway.search_web(
                f'"{ref.title or ref.raw[:200]}"',
                include_domains=self.settings.scholarly_domains,
                run_id=run_id,
                purpose=EXISTS_PURPOSE,
            )
            hits = hits[:5] + fallback[:5]
            best = max(hits, key=lambda h: score(ref, h)["composite"], default=None)
            valid = best is not None and self._candidate(ref, best)
        if not valid or best is None:
            query = ref.title or ref.raw[:200]
            return ExistenceResult(
                existence="not_found",
                reason="No matching paper in live scholarly search.",
                cache_key=key,
                evidence=[
                    {
                        "check_type": "existence",
                        "verdict": "not_found",
                        "api": "search",
                        "source_url": "https://api.search.tinyfish.ai?query=" + quote_plus(query),
                        "explanation": "No candidate met the title/author matching thresholds.",
                        "raw": {
                            "query": query,
                            "candidate_count": len(hits),
                            "candidates": [h.model_dump(exclude={"raw"}) for h in hits[:5]],
                        },
                    }
                ],
            )
        diffs = field_diffs(ref, best)
        s = score(ref, best)
        verdict = (
            "found"
            if s["title"] >= 0.9 and s["composite"] >= 0.85 and not diffs
            else "metadata_mismatch"
        )
        reason = (
            "Matching paper found."
            if verdict == "found"
            else "A matching paper has different citation metadata."
        )
        identifier_mismatch = False
        if ref.arxiv_id or ref.doi:
            url = (
                f"https://arxiv.org/abs/{normalize_arxiv(ref.arxiv_id)}"
                if ref.arxiv_id
                else f"https://doi.org/{ref.doi}"
            )
            page = (await self.gateway.fetch([url], run_id=run_id, purpose=EXISTS_PURPOSE))[url]
            if (
                isinstance(page, FetchedPage)
                and page.title
                and ref.title
                and fuzz.token_set_ratio(norm(ref.title), norm(page.title)) < 60
            ):
                verdict, reason = (
                    "metadata_mismatch",
                    "The identifier points to a different paper.",
                )
                identifier_mismatch = True
                evidence.append(
                    {
                        "check_type": "identifier",
                        "verdict": verdict,
                        "api": "fetch",
                        "source_url": url,
                        "source_title": page.title,
                        "quote": page.text[:500],
                        "explanation": reason,
                        "raw": page.raw,
                    }
                )
        canonical = best.model_dump(exclude={"raw"})
        evidence.append(
            {
                "check_type": "existence",
                "verdict": verdict,
                "api": "search",
                "source_url": best.url,
                "source_title": best.title,
                "quote": best.snippet or None,
                "explanation": reason,
                "confidence": s["composite"],
                "raw": best.raw,
            }
        )
        # A mismatched identifier must never poison the DOI/arXiv-keyed cache.
        if not identifier_mismatch:
            await (
                self.db.table("reference_cache")
                .upsert(
                    {
                        "key": key,
                        "canonical": canonical,
                        "fulltext_url": best.pdf_url or best.url,
                        "fetched_at": datetime.now(UTC).isoformat(),
                    }
                )
                .execute()
            )
        return ExistenceResult(
            existence=verdict,
            reason=reason,
            matched=canonical,
            field_diffs=diffs,
            cache_key=key,
            evidence=evidence,
        )

    @staticmethod
    def _candidate(ref: ParsedRef, hit: PaperHit) -> bool:
        s = score(ref, hit)
        return s["title"] >= 0.9 or (0.75 <= s["title"] < 0.9 and s["author"] >= 0.67)
