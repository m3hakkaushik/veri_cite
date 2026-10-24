from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.config import Settings
from app.models import ExtractedClaim, ParsedDocument, ParsedRef
from app.parsing.bib import ParsingError, parse_bib
from app.parsing.common import validate_extraction
from app.parsing.identifiers import identifier_error, implausible_year
from app.parsing.pdf import parse_pdf_bytes
from app.parsing.text import parse_text

FIXTURES = Path(__file__).parent / "fixtures"
SETTINGS = Settings(_env_file=None)


@pytest.mark.parametrize("value", ["1706.03762", "arXiv:1706.03762v2", "hep-th/9901001"])
def test_parsing_valid_arxiv(value):
    assert identifier_error(arxiv_id=value) is None


@pytest.mark.parametrize(
    "value", ["arXiv:2305.XXXX", "0000.00000", "2313.12345", "2300.12345", "0501.12345"]
)
def test_parsing_invalid_arxiv(value):
    assert identifier_error(arxiv_id=value) == "Invalid arXiv identifier"


def test_parsing_identifiers_and_year():
    assert identifier_error(doi="10.1016/S0140-6736(20)31180-6") is None
    assert identifier_error(doi="https://doi.org/10.1016/S0140-6736(20)31180-6") is None
    assert identifier_error(doi="10.1234/TODO") == "Invalid DOI identifier"
    assert implausible_year(1500) and implausible_year(9999)
    assert not implausible_year(2017) and not implausible_year(None)


def test_parsing_bibtex_v2_preserves_and_decodes():
    refs = parse_bib((FIXTURES / "references.bib").read_text())
    assert len(refs) == 5 and [r.idx for r in refs] == [1, 2, 3, 4, 5]
    assert refs[1].title == "Gödel and Nested Braces"
    assert refs[1].authors == ["Müller, Eva", "Doe, Jane"]
    assert refs[1].doi == "10.1234/fixture"
    assert refs[2].arxiv_id == "2305.XXXX"  # never repair a suspicious identifier
    assert refs[3].year is None and refs[3].authors == []
    assert "archivePrefix" in refs[0].raw
    with pytest.raises(ParsingError):
        parse_bib("@article{broken,title={missing closing brace}")


def test_parsing_claim_links_limits_and_verbatim():
    document = ParsedDocument(
        references=[ParsedRef(idx=1, raw="A")],
        claims=[ExtractedClaim(text=f"Measured {n}% [1].", citation_idxs=[1]) for n in range(5)],
    )
    assert len(validate_extraction(document, SETTINGS).claims) == 3
    document.claims = [ExtractedClaim(text="invented", citation_idxs=[1])]
    with pytest.raises(ParsingError):
        validate_extraction(document, SETTINGS, "actual text")
    document.claims = [ExtractedClaim(text="actual", citation_idxs=[2])]
    with pytest.raises(ParsingError):
        validate_extraction(document, SETTINGS)


async def test_parsing_empty_and_invalid_inputs_never_call_llm():
    llm = SimpleNamespace(generate_json=AsyncMock())
    with pytest.raises(ParsingError):
        await parse_text("", llm, SETTINGS, run_id=None)
    with pytest.raises(ParsingError):
        await parse_pdf_bytes(b"not a pdf", llm, SETTINGS, run_id=None)
    llm.generate_json.assert_not_called()


async def test_parsing_no_bibliography_keeps_no_invented_references():
    result = ParsedDocument(references=[], claims=[])
    llm = SimpleNamespace(generate_json=AsyncMock(return_value=result))
    assert (
        await parse_text("A plain paragraph with no references.", llm, SETTINGS, run_id=None)
    ).references == []
