"""Database enum contracts and provider-neutral verification payloads."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class InputType(StrEnum):
    TEXT = "text"
    PDF = "pdf"
    BIB = "bib"
    URL = "url"


class RunStatus(StrEnum):
    QUEUED = "queued"
    PARSING = "parsing"
    CHECKING = "checking"
    COMPLETED = "completed"
    FAILED = "failed"


class CitationStatus(StrEnum):
    PENDING = "pending"
    CHECKING = "checking"
    VERIFIED = "verified"
    PARTIALLY_VERIFIED = "partially_verified"
    NEEDS_REVIEW = "needs_review"
    NOT_FOUND = "not_found"
    NOT_SUPPORTED = "not_supported"
    RETRACTED = "retracted"
    ERROR = "error"


class ExistenceVerdict(StrEnum):
    PENDING = "pending"
    FOUND = "found"
    METADATA_MISMATCH = "metadata_mismatch"
    NOT_FOUND = "not_found"
    ERROR = "error"


class SupportVerdict(StrEnum):
    PENDING = "pending"
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    UNSUPPORTED = "unsupported"
    CONTRADICTED = "contradicted"
    UNVERIFIABLE = "unverifiable"
    NOT_APPLICABLE = "not_applicable"
    ERROR = "error"


class IntegrityVerdict(StrEnum):
    PENDING = "pending"
    CLEAN = "clean"
    CORRECTED = "corrected"
    CONCERN = "concern"
    RETRACTED = "retracted"
    UNKNOWN = "unknown"
    ERROR = "error"


class CurrencyVerdict(StrEnum):
    PENDING = "pending"
    CURRENT = "current"
    OUTDATED = "outdated"
    DISPUTED = "disputed"
    NO_RECENT_COVERAGE = "no_recent_coverage"
    NOT_APPLICABLE = "not_applicable"
    ERROR = "error"


class CheckType(StrEnum):
    IDENTIFIER = "identifier"
    EXISTENCE = "existence"
    SUPPORT = "support"
    INTEGRITY = "integrity"
    CURRENCY = "currency"
    ANSWER = "answer"


class TfApi(StrEnum):
    SEARCH = "search"
    FETCH = "fetch"
    AGENT = "agent"
    NONE = "none"


class PaperHit(BaseModel):
    title: str
    url: str
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    pdf_url: str | None = None
    cited_by_count: int | None = None
    snippet: str = ""
    publisher: str | None = None
    published_at: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class WebHit(PaperHit):
    pass


class NewsHit(WebHit):
    pass


class FetchedPage(BaseModel):
    url: str
    final_url: str | None = None
    title: str | None = None
    text: str
    published_at: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    raw: dict[str, Any] = Field(default_factory=dict)


class FetchError(BaseModel):
    url: str
    error: str


class AgentRetractionResult(BaseModel):
    status: Literal["retracted", "corrected", "concern", "clean", "unknown"]
    notice_url: str | None = None
    notice_date: str | None = None
    notice_title: str | None = None
    evidence_text: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class ParsedRef(BaseModel):
    idx: int = Field(ge=1)
    key: str | None = None
    raw: str
    title: str | None = None
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    url: str | None = None
    entry_type: str | None = None


class ExtractedClaim(BaseModel):
    text: str
    context: str | None = None
    citation_idxs: list[int] = Field(default_factory=list)
    is_time_sensitive: bool = False


class ParsedDocument(BaseModel):
    references: list[ParsedRef] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
