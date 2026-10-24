"""Live typed-output smoke through the Gemini wrapper, with persisted usage."""

import asyncio
import sys
from pathlib import Path

from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.clients.llm import GeminiProvider
from app.clients.usage import UsageRecorder
from app.config import get_settings
from app.db import create_worker_client


class ToySchema(BaseModel):
    sum: int


async def main() -> None:
    db = await create_worker_client()
    provider = GeminiProvider(get_settings(), UsageRecorder(db))
    try:
        result = await provider.generate_json("Return the sum of 2 and 3.", ToySchema)
        assert result.sum == 5
        print("PASS Gemini: valid structured output, sum=5")
    finally:
        await provider.close()
        await db.postgrest.aclose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"FAIL Gemini smoke: {type(error).__name__}, HTTP {getattr(error, 'code', 'n/a')}")
        raise SystemExit(1) from None
