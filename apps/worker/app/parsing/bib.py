"""BibTeX v2 parser: preserve entries and decode LaTeX metadata."""

import re

import bibtexparser
from bibtexparser.middlewares import LatexDecodingMiddleware

from app.models import ParsedRef
from app.parsing.identifiers import normalize_arxiv, normalize_doi


class ParsingError(ValueError):
    pass


def parse_bib(text: str) -> list[ParsedRef]:
    if not text.strip() or len(text.encode()) > 2 * 1024 * 1024:
        raise ParsingError("BibTeX must be nonempty and at most 2 MB")
    library = bibtexparser.parse_string(text, append_middleware=[LatexDecodingMiddleware()])
    if library.failed_blocks or not library.entries:
        raise ParsingError("Could not parse every BibTeX entry. Check braces and duplicate keys.")
    refs = []
    for idx, entry in enumerate(library.entries, 1):
        fields = {key.lower(): field.value.strip() for key, field in entry.fields_dict.items()}
        year = fields.get("year", "")
        doi, arxiv = fields.get("doi"), fields.get("eprint")
        is_arxiv = fields.get("archiveprefix", "").lower() == "arxiv"
        arxiv = arxiv if is_arxiv or (arxiv and re.fullmatch(r"\d{4}\.\S+", arxiv)) else None
        refs.append(
            ParsedRef(
                idx=idx,
                key=entry.key,
                raw=entry.raw or str(entry),
                title=fields.get("title"),
                authors=re.split(r"\s+and\s+", fields["author"]) if fields.get("author") else [],
                year=int(year) if year.isdigit() else None,
                venue=fields.get("journal") or fields.get("booktitle"),
                doi=normalize_doi(doi) if doi else None,
                arxiv_id=normalize_arxiv(arxiv) if arxiv else None,
                url=fields.get("url"),
                entry_type=entry.entry_type,
            )
        )
    return refs
