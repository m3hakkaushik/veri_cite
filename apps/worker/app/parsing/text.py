"""Text extraction through the LLM, with verbatim claim checks."""

from pathlib import Path

from app.clients.llm import LLMProvider
from app.config import Settings
from app.models import ParsedDocument
from app.parsing.bib import ParsingError
from app.parsing.common import validate_extraction

EXTRACT_PROMPT = (Path(__file__).resolve().parents[1] / "prompts/extract_v1.md").read_text()


async def parse_text(
    text: str, llm: LLMProvider, settings: Settings, *, run_id: str | None
) -> ParsedDocument:
    if not text.strip() or len(text) > 60_000:
        raise ParsingError("Text must be nonempty and at most 60,000 characters")
    document = await llm.generate_json(
        EXTRACT_PROMPT + "\nDOCUMENT:\n" + text, ParsedDocument, run_id=run_id
    )
    return validate_extraction(document, settings, text)
