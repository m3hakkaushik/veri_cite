"""Provider boundary tests: no network, credentials, or paid Agent usage."""

import hashlib
import hmac
import json
import re
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import BaseModel, ValidationError
from tinyfish.fetch.types import FetchError as SDKFetchError
from tinyfish.fetch.types import FetchResponse, FetchResult
from tinyfish.search.types import SearchQueryResponse, SearchResult

from app import models
from app.clients.common import TTLCache, bounded_raw, transient
from app.clients.llm import GeminiProvider
from app.clients.tinyfish import TinyFishGateway
from app.config import Settings, get_settings
from app.main import app


@pytest.fixture
def settings():
    return Settings(_env_file=None, worker_shared_secret="test-signing-key")


@pytest.fixture
def usage():
    return SimpleNamespace(
        record=AsyncMock(return_value=1), agent_available=AsyncMock(return_value=False)
    )


def test_database_enum_parity():
    sql = (Path(__file__).resolve().parents[3] / "supabase/migrations/0001_init.sql").read_text()
    for name, body in re.findall(r"create type (\w+) as enum \(([^;]+)\);", sql):
        enum = getattr(models, "".join(part.title() for part in name.split("_")))
        assert [item.value for item in enum] == re.findall("'([^']+)'", body)


def test_retry_only_transient_errors():
    assert transient(SimpleNamespace(status_code=429))
    assert transient(SimpleNamespace(status_code=503))
    assert transient(httpx.ReadTimeout("timeout"))
    for code in (400, 401, 402, 403, 404):
        assert not transient(SimpleNamespace(status_code=code))


def test_bounded_payload_and_expiring_lru():
    payload = bounded_raw({"text": "é" * 30_000})
    assert payload["truncated"]
    assert len(json.dumps(payload, ensure_ascii=False).encode()) <= 20_000
    cache = TTLCache(limit=2)
    cache.put("a", 1, 60)
    cache.put("b", 2, 60)
    assert cache.get("a") == 1
    cache.put("c", 3, 60)
    assert cache.get("b") is None
    cache.put("expired", 4, -1)
    assert cache.get("expired") is None


async def test_search_mapping_cache_and_sdk_filters(settings, usage):
    search = AsyncMock(
        return_value=SearchQueryResponse(
            query="Attention",
            results=[
                SearchResult(
                    title="Attention Is All You Need",
                    url="https://arxiv.org/abs/1706.03762",
                    snippet="Transformer",
                    position=1,
                    site_name="arxiv.org",
                    authors=None,
                    year=2017,
                )
            ],
            total_results=1,
        )
    )
    gateway = TinyFishGateway(
        settings, usage, client=SimpleNamespace(search=SimpleNamespace(query=search))
    )
    hit = (await gateway.search_papers("Attention", 2017, "run"))[0]
    assert hit.year == 2017 and hit.authors == []
    hit.title = "caller mutation"
    assert (await gateway.search_papers("Attention", 2017, "run"))[0].title != hit.title
    assert search.await_count == 1
    assert usage.record.call_args.kwargs["cache_hit"] is True
    await gateway.search_web("test", include_domains=["arxiv.org", "nature.com"], run_id="run")
    assert search.call_args.kwargs["include_domains"] == "arxiv.org,nature.com"


async def test_fetch_batches_partial_failures_and_cache(settings, usage):
    async def fetch(**kwargs):
        urls = kwargs["urls"]
        return FetchResponse(
            results=[
                FetchResult(url=u, text="readable", format="markdown")
                for u in urls
                if not u.endswith("11")
            ],
            errors=[SDKFetchError(url=u, error="paywall") for u in urls if u.endswith("11")],
        )

    sdk_fetch = AsyncMock(side_effect=fetch)
    gateway = TinyFishGateway(
        settings, usage, client=SimpleNamespace(fetch=SimpleNamespace(get_contents=sdk_fetch))
    )
    urls = [f"https://example.com/{n}" for n in range(12)]
    result = await gateway.fetch(urls, run_id="run", purpose="Check this citation")
    assert len(result) == 12 and isinstance(result[urls[-1]], models.FetchError)
    assert [len(c.kwargs["urls"]) for c in sdk_fetch.call_args_list] == [10, 2]
    await gateway.fetch(urls[:1], run_id="run", purpose="Check this citation")
    assert sdk_fetch.await_count == 2


async def test_agent_cap_prevents_paid_dispatch(settings, usage):
    sdk = SimpleNamespace(agent=SimpleNamespace(run=AsyncMock()))
    gateway = TinyFishGateway(settings, usage, client=sdk)
    assert await gateway.agent_retraction("https://doi.org/test", run_id="run") is None
    sdk.agent.run.assert_not_called()
    usage.record.assert_not_called()


class Toy(BaseModel):
    value: int


async def test_gemini_pdf_and_json_validation(settings, usage):
    generate = AsyncMock(return_value=SimpleNamespace(text='{"value":5}', usage_metadata=None))
    provider = GeminiProvider(
        settings,
        usage,
        client=SimpleNamespace(
            aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate))
        ),
    )
    result = await provider.generate_json("extract", Toy, files=[(b"%PDF-test", "application/pdf")])
    assert result.value == 5
    assert generate.call_args.kwargs["contents"][1].inline_data.mime_type == "application/pdf"
    generate.return_value.text = '{"value":"invented"}'
    with pytest.raises(ValidationError):
        await provider.generate_json("extract", Toy)
    assert usage.record.call_args.kwargs["ok"] is False
    assert generate.await_count == 2  # schema failure is never retried


async def test_hmac_rejects_missing_tampered_expired_signatures(settings):
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    from unittest.mock import patch

    body = b"{}"

    def headers(timestamp, signed=body):
        signature = hmac.new(
            b"test-signing-key", timestamp.encode() + b"." + signed, hashlib.sha256
        ).hexdigest()
        return {"X-VeriCite-Timestamp": timestamp, "X-VeriCite-Signature": signature}

    with patch("app.security.get_settings", return_value=settings):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://worker"
        ) as client:
            url = "/internal/runs/x/start"
            assert (await client.post(url, content=body)).status_code == 401
            assert (
                await client.post(url, content=body, headers=headers(str(int(time.time()) - 301)))
            ).status_code == 401
            assert (
                await client.post(
                    url, content=b'{"tampered":true}', headers=headers(str(int(time.time())))
                )
            ).status_code == 401
            response = await client.post(url, content=body, headers=headers(str(int(time.time()))))
            assert response.status_code == 202 and response.json() == {"accepted": True}
