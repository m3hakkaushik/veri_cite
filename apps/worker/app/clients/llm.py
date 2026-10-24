"""Gemini implementation behind a provider-neutral structured-output interface."""

import asyncio
from collections.abc import AsyncIterator
from time import monotonic
from typing import Literal, Protocol, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel
from tenacity import AsyncRetrying, retry_if_exception, stop_after_attempt, wait_exponential

from app.clients.common import transient
from app.clients.usage import UsageRecorder
from app.config import Settings

Model = Literal["fast", "strong"]
T = TypeVar("T", bound=BaseModel)
FileParts = list[tuple[bytes, str]]


class LLMProvider(Protocol):
    async def generate_json(
        self,
        prompt: str,
        schema: type[T],
        model: Model = "fast",
        files: FileParts | None = None,
        *,
        run_id: str | None = None,
        answer_id: str | None = None,
    ) -> T: ...

    def stream_text(
        self,
        prompt: str,
        model: Model = "fast",
        *,
        run_id: str | None = None,
        answer_id: str | None = None,
    ) -> AsyncIterator[str]: ...


class GeminiProvider:
    def __init__(self, settings: Settings, usage: UsageRecorder, *, client=None):
        self.settings, self.usage = settings, usage
        self.client = client or genai.Client(
            api_key=settings.google_api_key.get_secret_value(),
            http_options=types.HttpOptions(
                timeout=120_000, retry_options=types.HttpRetryOptions(attempts=1)
            ),
        )
        self.slots = asyncio.Semaphore(4)

    async def close(self) -> None:
        await self.client.aio.aclose()
        self.client.close()

    def _model(self, model: Model) -> str:
        return self.settings.llm_model_fast if model == "fast" else self.settings.llm_model_strong

    async def generate_json(
        self,
        prompt: str,
        schema: type[T],
        model: Model = "fast",
        files: FileParts | None = None,
        *,
        run_id: str | None = None,
        answer_id: str | None = None,
    ) -> T:
        parts = [types.Part.from_text(text=prompt)]
        for data, mime_type in files or []:
            if mime_type != "application/pdf" or len(data) > 20 * 1024 * 1024:
                raise ValueError("Only PDFs up to 20 MB are accepted")
            parts.append(types.Part.from_bytes(data=data, mime_type=mime_type))
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, max=8),
            retry=retry_if_exception(transient),
            reraise=True,
        ):
            with attempt:
                start, ok, units = monotonic(), False, 0
                try:
                    async with self.slots:
                        response = await self.client.aio.models.generate_content(
                            model=self._model(model),
                            contents=parts,
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                response_schema=schema,
                                temperature=0,
                                tools=[],
                                thinking_config=types.ThinkingConfig(thinking_level="LOW")
                                if model == "fast"
                                else None,
                            ),
                        )
                    if response.usage_metadata:
                        units = response.usage_metadata.total_token_count or 0
                    result = schema.model_validate_json(response.text or "")
                    ok = True
                    return result
                finally:
                    await self.usage.record(
                        provider="gemini",
                        api="flash" if model == "fast" else "pro",
                        run_id=run_id,
                        answer_id=answer_id,
                        units=units,
                        latency_ms=round((monotonic() - start) * 1000),
                        ok=ok,
                    )
        raise RuntimeError("Gemini retry loop did not produce a response")

    async def stream_text(
        self,
        prompt: str,
        model: Model = "fast",
        *,
        run_id: str | None = None,
        answer_id: str | None = None,
    ) -> AsyncIterator[str]:
        # Never replay an already-emitted stream. Grounded Answer composes JSON,
        # validates quotes, and emits sentences instead of using this raw stream.
        start, ok, units = monotonic(), False, 0
        try:
            async with self.slots:
                stream = await self.client.aio.models.generate_content_stream(
                    model=self._model(model),
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0,
                        tools=[],
                        thinking_config=types.ThinkingConfig(thinking_level="LOW")
                        if model == "fast"
                        else None,
                    ),
                )
                async for chunk in stream:
                    if chunk.usage_metadata:
                        units = chunk.usage_metadata.total_token_count or 0
                    if chunk.text:
                        yield chunk.text
            ok = True
        finally:
            await self.usage.record(
                provider="gemini",
                api="flash" if model == "fast" else "pro",
                run_id=run_id,
                answer_id=answer_id,
                units=units,
                latency_ms=round((monotonic() - start) * 1000),
                ok=ok,
            )
