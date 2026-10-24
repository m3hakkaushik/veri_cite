"""Identifier pre-checks do not contact the network or spend provider quota."""

import re
from datetime import UTC, datetime

PLACEHOLDER = re.compile(r"x{2,}|0000\.00000|TODO|\?", re.IGNORECASE)
DOI = re.compile(r"^10\.\d{4,9}/[-._;()/:A-Z0-9]+$", re.IGNORECASE)
ARXIV_OLD = re.compile(r"^[a-z\-]+(?:\.[A-Z]{2})?/\d{7}(?:v\d+)?$")
ARXIV_NEW = re.compile(r"^(\d{2})(\d{2})\.\d{4,5}(?:v[1-9]\d*)?$")


def normalize_doi(value: str) -> str:
    return re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", value.strip(), flags=re.I)


def normalize_arxiv(value: str) -> str:
    result = re.sub(
        r"^(?:https?://arxiv\.org/(?:abs|pdf)/|arxiv:\s*)", "", value.strip(), flags=re.I
    )
    return re.sub(r"\.pdf$", "", result, flags=re.I)


def identifier_error(*, doi: str | None = None, arxiv_id: str | None = None) -> str | None:
    if doi:
        value = normalize_doi(doi)
        if PLACEHOLDER.search(value) or not DOI.fullmatch(value):
            return "Invalid DOI identifier"
    if arxiv_id:
        value = normalize_arxiv(arxiv_id)
        new = ARXIV_NEW.fullmatch(value)
        valid_new = bool(new and int(new[1]) >= 7 and 1 <= int(new[2]) <= 12)
        if PLACEHOLDER.search(value) or not (valid_new or ARXIV_OLD.fullmatch(value)):
            return "Invalid arXiv identifier"
    return None


def implausible_year(year: int | None) -> bool:
    return year is not None and not 1600 <= year <= datetime.now(UTC).year + 1
