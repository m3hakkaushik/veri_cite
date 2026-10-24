"""Persist provider attempts and periodically refresh the per-run TinyFish meter."""

import asyncio
from datetime import UTC, datetime
from time import monotonic

from supabase import AsyncClient


class UsageRecorder:
    def __init__(self, db: AsyncClient):
        self.db = db
        self._lock = asyncio.Lock()
        self._updated: dict[str, float] = {}

    async def record(
        self,
        *,
        provider: str,
        api: str,
        run_id: str | None = None,
        answer_id: str | None = None,
        units: int = 1,
        cache_hit: bool = False,
        latency_ms: int = 0,
        ok: bool = True,
    ) -> int:
        result = (
            await self.db.table("api_usage")
            .insert(
                {
                    "provider": provider,
                    "api": api,
                    "run_id": run_id,
                    "answer_id": answer_id,
                    "units": units,
                    "cache_hit": cache_hit,
                    "latency_ms": latency_ms,
                    "ok": ok,
                }
            )
            .execute()
        )
        if run_id and provider == "tinyfish":
            await self.flush(run_id)
        return result.data[0]["id"]

    async def flush(self, run_id: str, *, force: bool = False) -> None:
        async with self._lock:
            if not force and monotonic() - self._updated.get(run_id, 0) < 2:
                return
            rows = (
                await self.db.table("api_usage")
                .select("api,cache_hit")
                .eq("run_id", run_id)
                .eq("provider", "tinyfish")
                .execute()
            )
            counts = {"search": 0, "fetch": 0, "agent": 0, "cache_hits": 0}
            for row in rows.data:
                key = "cache_hits" if row["cache_hit"] else row["api"]
                if key in counts:
                    counts[key] += 1
            await (
                self.db.table("runs").update({"tinyfish_usage": counts}).eq("id", run_id).execute()
            )
            self._updated[run_id] = monotonic()

    async def agent_available(self, run_id: str, per_run: int, daily: int) -> bool:
        """Count failed attempts too: a timed-out Agent may already have spent credits."""
        start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        if per_run == 0 or daily == 0:
            return False
        result = (
            await self.db.table("api_usage")
            .select("id", count="exact", head=True)
            .eq("provider", "tinyfish")
            .eq("api", "agent")
            .eq("cache_hit", False)
            .gte("created_at", start.isoformat())
            .execute()
        )
        job = (
            await self.db.table("api_usage")
            .select("id", count="exact", head=True)
            .eq("provider", "tinyfish")
            .eq("api", "agent")
            .eq("cache_hit", False)
            .eq("run_id", run_id)
            .execute()
        )
        return result.count < daily and job.count < per_run
