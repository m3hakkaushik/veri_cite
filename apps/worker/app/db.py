"""Worker-only Supabase access. Never import or expose the service key in web clients."""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import AsyncClient, AsyncClientOptions, acreate_client


async def create_worker_client() -> AsyncClient:
    """Lazy setup keeps /health usable before hosted credentials are configured."""
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    if not url.startswith("https://"):
        raise RuntimeError("SUPABASE_URL must be the hosted project's HTTPS URL")
    return await acreate_client(
        url,
        key,
        options=AsyncClientOptions(
            persist_session=False,
            auto_refresh_token=False,
            postgrest_client_timeout=30,
            storage_client_timeout=60,
        ),
    )
