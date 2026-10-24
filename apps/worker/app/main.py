"""VeriCite worker entrypoint. Hosted Supabase and Gemini; no local services."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="VeriCite worker", version="0.1.0")


class Health(BaseModel):
    ok: bool = True
    pdf_parser: Literal["gemini"] = "gemini"
    version: str = app.version


@app.get("/health", response_model=Health)
async def health() -> Health:
    """Process liveness, not a claim that external providers are configured."""
    return Health()
