"""Bounded payloads and retry rules shared by provider wrappers."""

import json
from collections import OrderedDict
from time import monotonic
from typing import Any

import httpx
from tinyfish import APIConnectionError


def transient(error: BaseException) -> bool:
    status = getattr(error, "status_code", None) or getattr(error, "code", None)
    return (
        isinstance(error, (httpx.TimeoutException, httpx.NetworkError, APIConnectionError))
        or status == 429
        or (isinstance(status, int) and 500 <= status < 600)
    )


def bounded_raw(value: Any) -> dict[str, Any]:
    """Keep valid JSON under the evidence contract's 20 KB limit."""
    data = value.model_dump(mode="json") if hasattr(value, "model_dump") else value
    encoded = json.dumps(data, ensure_ascii=False, default=str).encode()
    if len(encoded) <= 20_000:
        return data if isinstance(data, dict) else {"value": data}
    return {"truncated": True, "preview": encoded[:18_000].decode(errors="ignore")}


class TTLCache:
    """Process-local bounded LRU; full page text never enters the shared database."""

    def __init__(self, limit: int = 128):
        self.limit = limit
        self.items: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        item = self.items.pop(key, None)
        if item and item[0] > monotonic():
            self.items[key] = item
            return item[1]
        return None

    def put(self, key: str, value: Any, ttl: float) -> None:
        self.items[key] = (monotonic() + ttl, value)
        self.items.move_to_end(key)
        while len(self.items) > self.limit:
            self.items.popitem(last=False)
