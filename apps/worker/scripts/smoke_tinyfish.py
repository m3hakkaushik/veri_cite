"""Live Search/Fetch smoke through the gateway. Logs real usage; never runs Agent."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.clients.tinyfish import TinyFishGateway
from app.clients.usage import UsageRecorder
from app.config import get_settings
from app.db import create_worker_client
from app.models import FetchedPage


async def main() -> None:
    db = await create_worker_client()
    gateway = TinyFishGateway(get_settings(), UsageRecorder(db))
    try:
        hits = await gateway.search_papers("Attention Is All You Need", 2017, None)
        assert any("attention is all you need" in hit.title.lower() for hit in hits)
        print(f"PASS Search: {len(hits)} candidates")
        for hit in hits[:3]:
            print(hit.title, hit.url)
        url = "https://arxiv.org/abs/1706.03762"
        pages = await gateway.fetch(
            [url], run_id=None, purpose="Read this paper to verify a cited claim."
        )
        page = pages[url]
        assert isinstance(page, FetchedPage), "Fetch did not return readable text"
        assert "transformer" in page.text.lower(), "Expected Transformer in fetched text"
        print(f"PASS Fetch: {len(page.text)} characters, contains Transformer")
    finally:
        await gateway.close()
        await db.postgrest.aclose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        # Never emit a provider traceback/body; it may include request credentials.
        print(
            f"FAIL TinyFish smoke: {type(error).__name__}, "
            f"HTTP {getattr(error, 'status_code', 'n/a')}"
        )
        raise SystemExit(1) from None
