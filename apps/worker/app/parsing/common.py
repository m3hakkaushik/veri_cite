"""Validate extraction links and enforce claim limits before database writes."""

import re

from app.config import Settings
from app.models import ParsedDocument
from app.parsing.bib import ParsingError


def validate_extraction(
    document: ParsedDocument, settings: Settings, source: str | None = None
) -> ParsedDocument:
    ids = [ref.idx for ref in document.references]
    if ids != list(range(1, len(ids) + 1)):
        raise ParsingError("Extracted reference indices are not sequential")
    counts: dict[int, int] = {}
    claims = []
    uncited = 0
    normalized = " ".join(source.split()) if source else None
    ordered = sorted(
        document.claims, key=lambda c: not bool(re.search(r"\d|more|less|higher|lower", c.text))
    )
    for claim in ordered:
        if not claim.text.strip() or any(idx not in ids for idx in claim.citation_idxs):
            raise ParsingError("An extracted claim has empty text or an invalid citation link")
        if normalized and " ".join(claim.text.split()) not in normalized:
            raise ParsingError("An extracted claim was not copied from the input")
        claim.citation_idxs = list(dict.fromkeys(claim.citation_idxs))
        if not claim.citation_idxs:
            if not claim.is_time_sensitive or uncited >= settings.currency_max_claims:
                continue
            uncited += 1
        else:
            claim.citation_idxs = [
                idx
                for idx in claim.citation_idxs
                if counts.get(idx, 0) < settings.claims_per_citation
            ]
            if not claim.citation_idxs:
                continue
            for idx in claim.citation_idxs:
                counts[idx] = counts.get(idx, 0) + 1
        claims.append(claim)
    document.claims = claims
    return document
