"""Deterministic title/author/year/venue matching per docs/08."""

import re
import unicodedata

from rapidfuzz import fuzz

from app.models import PaperHit, ParsedRef

ALIASES = {
    # DECISION: the live Search API abbreviates this venue as "Advances in neural …".
    "advances in neural": "neurips",
    "nips": "neurips",
    "neural information processing systems": "neurips",
    "advances in neural information processing systems": "neurips",
    "international conference on machine learning": "icml",
    "international conference on learning representations": "iclr",
    "association for computational linguistics": "acl",
    "empirical methods in natural language processing": "emnlp",
    "computer vision and pattern recognition": "cvpr",
}


def norm(text: str | None) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


def venue_alias(text: str | None) -> str:
    value = norm(text)
    return ALIASES.get(value, value)


def lastnames(authors: list[str]) -> set[str]:
    names = []
    for author in authors:
        name = re.sub(r"\bet\.?\s+al\.?[\s,]*$", "", author, flags=re.I).strip(" ,")
        if name and norm(name) not in {"and others", "others"}:
            names.append(name)
    return {norm(a.split(",")[0] if "," in a else a.split()[-1]) for a in names[:3]}


def score(ref: ParsedRef, hit: PaperHit) -> dict[str, float]:
    title = fuzz.token_sort_ratio(norm(ref.title or ref.raw[:200]), norm(hit.title)) / 100
    ours, theirs = lastnames(ref.authors), lastnames(hit.authors)
    author = len(ours & theirs) / max(1, len(ours)) if ours else 1.0
    delta = abs(ref.year - hit.year) if ref.year and hit.year else None
    year = 1.0 if delta in (None, 0) else 0.7 if delta == 1 else 0.0
    venue = (
        fuzz.token_set_ratio(venue_alias(ref.venue), venue_alias(hit.venue)) / 100
        if ref.venue and hit.venue
        else 1.0
    )
    return {
        "title": title,
        "author": author,
        "year": year,
        "venue": venue,
        "composite": 0.60 * title + 0.25 * author + 0.10 * year + 0.05 * venue,
    }


def field_diffs(ref: ParsedRef, hit: PaperHit) -> list[dict]:
    diffs = []
    for field, cited, actual in (
        ("title", ref.title, hit.title),
        ("year", ref.year, hit.year),
        ("venue", ref.venue, hit.venue),
    ):
        if cited is None or actual is None:
            continue
        equivalent = (
            venue_alias(str(cited)) == venue_alias(str(actual))
            if field == "venue"
            else norm(str(cited)) == norm(str(actual))
        )
        if not equivalent:
            diffs.append({"field": field, "cited": str(cited), "actual": str(actual)})
    if ref.authors and hit.authors and not lastnames(ref.authors) <= lastnames(hit.authors):
        diffs.append(
            {"field": "authors", "cited": "; ".join(ref.authors), "actual": "; ".join(hit.authors)}
        )
    return diffs
