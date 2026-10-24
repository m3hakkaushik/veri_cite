"""The only verification web-access layer. No checker calls the SDK directly."""

import asyncio
import hashlib
import json
from time import monotonic
from typing import Any

from aiolimiter import AsyncLimiter
from tenacity import AsyncRetrying, retry_if_exception, stop_after_attempt, wait_exponential
from tinyfish import AsyncTinyFish
from tinyfish.agent.types import BrowserProfile

from app.clients.common import TTLCache, bounded_raw, transient
from app.clients.usage import UsageRecorder
from app.config import Settings
from app.models import AgentRetractionResult, FetchedPage, FetchError, NewsHit, PaperHit, WebHit

EXISTS_PURPOSE = (
    "Verify that this academic paper exists and get its exact title, authors, year and venue."
)
ANSWER_PURPOSE = "Gather current, citable sources to answer this question factually."
RETRACTION_GOAL = (
    "Determine whether THIS article has been RETRACTED, CORRECTED or has an EXPRESSION OF CONCERN. "
    "Look for banners, labels, linked retraction notices, and updates. Do not log in. "
    "Return JSON with status (retracted|corrected|concern|clean|unknown), notice_url, notice_date, "
    "notice_title, evidence_text (a verbatim passage). Use null for missing fields."
)


class TinyFishGateway:
    def __init__(self, settings: Settings, usage: UsageRecorder, *, client: Any = None):
        self.settings, self.usage = settings, usage
        self.client = client or AsyncTinyFish(
            api_key=settings.tinyfish_api_key.get_secret_value(),
            max_retries=0,
            timeout=120,
        )
        self.search_limiter = AsyncLimiter(settings.tinyfish_search_rpm, 60)
        self.fetch_slots = asyncio.Semaphore(settings.tinyfish_fetch_concurrency)
        self.agent_slots = asyncio.Semaphore(2)
        self.agent_lock = asyncio.Lock()
        self.cache = TTLCache()

    async def close(self) -> None:
        await self.client.close()

    async def _call(self, api: str, run_id: str | None, call: Any, *, units: int = 1) -> Any:
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, max=8),
            retry=retry_if_exception(transient),
            reraise=True,
        ):
            with attempt:
                start, ok = monotonic(), False
                try:
                    if api == "search":
                        async with self.search_limiter:
                            result = await call()
                    else:
                        async with self.fetch_slots:
                            result = await call()
                    ok = True
                    return result
                finally:
                    await self.usage.record(
                        provider="tinyfish",
                        api=api,
                        run_id=run_id,
                        units=units,
                        latency_ms=round((monotonic() - start) * 1000),
                        ok=ok,
                    )

    async def _search(self, query: str, run_id: str | None, hit_type: type[PaperHit], **kwargs):
        key = (
            "search:"
            + hashlib.sha256(json.dumps([query, kwargs], sort_keys=True).encode()).hexdigest()
        )
        cached = self.cache.get(key)
        if cached is not None:
            await self.usage.record(
                provider="tinyfish", api="search", run_id=run_id, cache_hit=True, units=0
            )
            return [hit.model_copy(deep=True) for hit in cached]
        response = await self._call(
            "search", run_id, lambda: self.client.search.query(query=query, **kwargs)
        )
        hits = [
            hit_type(
                **r.model_dump(exclude={"date", "raw", "authors"}),
                authors=r.authors or [],
                published_at=r.date,
                raw=bounded_raw(r),
            )
            for r in response.results
        ]
        # DECISION: unverified candidates stay in bounded memory. Only M4's matched
        # canonical record belongs in reference_cache; never persist a guessed first hit.
        self.cache.put(
            key, [hit.model_copy(deep=True) for hit in hits], self.settings.cache_ttl_days * 86400
        )
        return hits

    async def search_papers(
        self, title: str, year: int | None, run_id: str | None
    ) -> list[PaperHit]:
        years = (
            {"pub_year_min": max(0, year - 1), "pub_year_max": min(9999, year + 1)} if year else {}
        )
        return await self._search(
            title, run_id, PaperHit, domain_type="research_paper", purpose=EXISTS_PURPOSE, **years
        )

    async def search_web(
        self,
        query: str,
        *,
        include_domains: list[str] | None = None,
        run_id: str | None,
        purpose: str = ANSWER_PURPOSE,
    ) -> list[WebHit]:
        return await self._search(
            query,
            run_id,
            WebHit,
            domain_type="web",
            purpose=purpose,
            include_domains=",".join(include_domains) if include_domains else None,
        )

    async def search_news(
        self, query: str, *, recency_minutes: int, run_id: str | None
    ) -> list[NewsHit]:
        return await self._search(
            query,
            run_id,
            NewsHit,
            domain_type="news",
            recency_minutes=recency_minutes,
            purpose=(
                "Find the most recent news coverage to check whether this claim is still accurate."
            ),
        )

    async def fetch(
        self, urls: list[str], *, run_id: str | None, purpose: str
    ) -> dict[str, FetchedPage | FetchError]:
        output: dict[str, FetchedPage | FetchError] = {}
        missing = []
        for url in dict.fromkeys(urls):
            page = self.cache.get("fetch:" + url)
            if page is None:
                missing.append(url)
            else:
                output[url] = page.model_copy(deep=True)
                await self.usage.record(
                    provider="tinyfish", api="fetch", run_id=run_id, units=0, cache_hit=True
                )
        for offset in range(0, len(missing), 10):
            batch = missing[offset : offset + 10]
            response = await self._call(
                "fetch",
                run_id,
                lambda batch=batch: self.client.fetch.get_contents(
                    urls=batch,
                    format="markdown",
                    purpose=purpose,
                    ttl=0,
                    per_url_timeout_ms=45000,
                ),
                units=len(batch),
            )
            for item in response.results:
                if not item.text:
                    output[item.url] = FetchError(url=item.url, error="No readable text returned")
                    continue
                page = FetchedPage(
                    url=item.url,
                    final_url=item.final_url,
                    title=item.title,
                    text=item.text,
                    published_at=item.published_date,
                    raw=bounded_raw(item),
                )
                self.cache.put("fetch:" + item.url, page.model_copy(deep=True), 86400)
                output[item.url] = page
            for error in response.errors:
                output[error.url] = FetchError(url=error.url, error=error.error)
            for url in batch:
                output.setdefault(url, FetchError(url=url, error="No result returned for URL"))
        return output

    async def agent_retraction(self, url: str, *, run_id: str) -> AgentRetractionResult | None:
        """Only IntegrityChecker.escalate() may call this. No Agent smoke calls.

        Reservations are persisted BEFORE dispatch. Never retry ambiguous paid
        requests automatically: even a timeout may have started a billed run.
        """
        cached = self.cache.get("agent:" + url)
        if cached:
            await self.usage.record(
                provider="tinyfish", api="agent", run_id=run_id, cache_hit=True, units=0
            )
            return cached.model_copy(deep=True)
        async with self.agent_slots:
            async with self.agent_lock:
                if not await self.usage.agent_available(
                    run_id, self.settings.agent_max_runs_per_job, self.settings.agent_daily_cap
                ):
                    return None
                usage_id = await self.usage.record(
                    provider="tinyfish", api="agent", run_id=run_id, ok=False
                )
            start = monotonic()
            ok = False
            try:
                response = await self.client.agent.run(
                    url=url, goal=RETRACTION_GOAL, browser_profile=BrowserProfile.LITE
                )
                if response.status != "COMPLETED" or not response.result:
                    return None
                result = AgentRetractionResult.model_validate(response.result)
                result.raw = bounded_raw(response)
                self.cache.put(
                    "agent:" + url,
                    result.model_copy(deep=True),
                    self.settings.cache_ttl_days * 86400,
                )
                ok = True
                return result
            finally:
                await (
                    self.usage.db.table("api_usage")
                    .update({"ok": ok, "latency_ms": round((monotonic() - start) * 1000)})
                    .eq("id", usage_id)
                    .execute()
                )
