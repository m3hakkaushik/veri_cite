"""Worker HMAC verification per docs/10: timestamp.rawBody, five-minute window."""

import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from app.config import get_settings


async def verify_signature(request: Request) -> None:
    secret = get_settings().worker_shared_secret.get_secret_value()
    if not secret:
        raise HTTPException(
            503, detail={"code": "not_configured", "message": "Worker signing is not configured."}
        )
    timestamp = request.headers.get("X-VeriCite-Timestamp", "")
    signature = request.headers.get("X-VeriCite-Signature", "")
    try:
        fresh = abs(time.time() - int(timestamp)) <= 300
    except ValueError:
        fresh = False
    raw = await request.body()
    digest = hmac.new(secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    if not fresh or not hmac.compare_digest(digest, signature):
        raise HTTPException(
            401, detail={"code": "unauthorized", "message": "Invalid worker signature."}
        )
