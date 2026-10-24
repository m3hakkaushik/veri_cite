"""Live extraction of controlled PDF/text fixtures; assertions are not verdicts."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.clients.llm import GeminiProvider
from app.clients.usage import UsageRecorder
from app.config import get_settings
from app.db import create_worker_client
from app.parsing.pdf import parse_pdf_bytes
from app.parsing.text import parse_text


async def main():
    db = await create_worker_client()
    settings = get_settings()
    llm = GeminiProvider(settings, UsageRecorder(db))
    fixtures = Path(__file__).resolve().parents[1] / "tests/fixtures"
    try:
        for kind in ("pdf", "text"):
            if kind == "pdf":
                document = await parse_pdf_bytes(
                    (fixtures / "document.pdf").read_bytes(), llm, settings, run_id=None
                )
            else:
                document = await parse_text(
                    (fixtures / "document.txt").read_text(), llm, settings, run_id=None
                )
            assert len(document.references) == 12
            assert all(any(idx in c.citation_idxs for c in document.claims) for idx in (1, 12))
            assert document.references[-1].arxiv_id == "2305.XXXX"
            print(
                f"PASS {kind}: 12 references, claims linked to [1] and [12], placeholder preserved",
                flush=True,
            )
    finally:
        await llm.close()
        await db.postgrest.aclose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"FAIL parsing smoke: {type(error).__name__}, HTTP {getattr(error, 'code', 'n/a')}")
        raise SystemExit(1) from None
