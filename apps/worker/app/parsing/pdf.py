"""Private Supabase object -> Gemini PDF bytes -> validated extraction."""

from supabase import AsyncClient

from app.clients.llm import LLMProvider
from app.config import Settings
from app.models import ParsedDocument
from app.parsing.bib import ParsingError
from app.parsing.common import validate_extraction
from app.parsing.text import EXTRACT_PROMPT


async def parse_pdf_bytes(
    data: bytes, llm: LLMProvider, settings: Settings, *, run_id: str | None
) -> ParsedDocument:
    if not data.startswith(b"%PDF-") or len(data) > 20 * 1024 * 1024:
        raise ParsingError("Expected a valid PDF up to 20 MB")
    document = await llm.generate_json(
        EXTRACT_PROMPT, ParsedDocument, files=[(data, "application/pdf")], run_id=run_id
    )
    return validate_extraction(document, settings)


async def parse_pdf(
    storage_path: str, db: AsyncClient, llm: LLMProvider, settings: Settings, *, run_id: str
) -> ParsedDocument:
    # Path is loaded from the authorized run, never a user-supplied remote URL.
    data = await db.storage.from_("uploads").download(storage_path)
    return await parse_pdf_bytes(data, llm, settings, run_id=run_id)
