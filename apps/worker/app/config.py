"""Validated worker configuration. Secrets are excluded from model reprs."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore"
    )
    app_env: str = "development"
    port: int = 8000
    supabase_url: str = ""
    supabase_service_role_key: SecretStr = SecretStr("")
    worker_shared_secret: SecretStr = SecretStr("")
    tinyfish_api_key: SecretStr = SecretStr("")
    google_api_key: SecretStr = SecretStr("")
    llm_model_fast: str = "gemini-3.8-flash"
    llm_model_strong: str = "gemini-3.1-pro-preview"
    citation_concurrency: int = Field(8, ge=1, le=32)
    tinyfish_search_rpm: int = Field(30, ge=1)
    tinyfish_fetch_concurrency: int = Field(3, ge=1, le=10)
    agent_max_runs_per_job: int = Field(5, ge=0, le=5)
    agent_daily_cap: int = Field(60, ge=0)
    support_max_chars: int = Field(400_000, ge=1)
    claims_per_citation: int = Field(3, ge=1)
    currency_max_claims: int = Field(5, ge=0)
    cache_ttl_days: int = Field(7, ge=1)
    enable_secondary_signals: bool = False
    scholarly_domains: list[str] = [
        "arxiv.org",
        "semanticscholar.org",
        "openreview.net",
        "aclanthology.org",
        "proceedings.neurips.cc",
        "papers.nips.cc",
        "dl.acm.org",
        "ieeexplore.ieee.org",
        "link.springer.com",
        "sciencedirect.com",
        "nature.com",
        "pubmed.ncbi.nlm.nih.gov",
        "ncbi.nlm.nih.gov",
        "jstor.org",
        "wiley.com",
        "tandfonline.com",
        "plos.org",
        "biorxiv.org",
        "medrxiv.org",
    ]
    integrity_domains: list[str] = [
        "retractionwatch.com",
        "retractiondatabase.org",
        "pubpeer.com",
        "thelancet.com",
        "nejm.org",
        "nature.com",
        "sciencedirect.com",
        "springer.com",
        "wiley.com",
        "plos.org",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
