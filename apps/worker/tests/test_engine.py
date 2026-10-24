import pytest

from app.engine.matching import field_diffs, norm, score
from app.engine.verdict import rollup, summarize
from app.models import PaperHit, ParsedRef


def test_matching_exact_accent_and_venue_alias():
    ref = ParsedRef(
        idx=1,
        raw="fixture",
        title="Attention Is All You Need",
        authors=["Vaswani, A."],
        year=2017,
        venue="NIPS",
    )
    hit = PaperHit(
        title=ref.title,
        authors=["Ashish Vaswani"],
        year=2017,
        venue="NeurIPS",
        url="https://arxiv.org/abs/1706.03762",
    )
    assert score(ref, hit)["composite"] == 1.0
    assert field_diffs(ref, hit) == []
    assert norm("Gödel: {Test}") == "godel test"
    hit.year = 2018
    assert score(ref, hit)["year"] == 0.7
    assert field_diffs(ref, hit) == [{"field": "year", "cited": "2017", "actual": "2018"}]
    hit.authors = ["Another Researcher"]
    assert score(ref, hit)["author"] == 0
    hit.title = "Invented Graph Recall Framework"
    assert score(ref, hit)["title"] < 0.75


@pytest.mark.parametrize(
    "existence,support,integrity,claims,expected",
    [
        ("not_found", "supported", "clean", True, "not_found"),
        ("found", "supported", "retracted", True, "retracted"),
        ("found", "contradicted", "clean", True, "not_supported"),
        ("metadata_mismatch", "supported", "clean", True, "needs_review"),
        ("found", "unverifiable", "unknown", True, "partially_verified"),
        ("found", "not_applicable", "unknown", False, "verified"),
        ("error", "error", "unknown", False, "error"),
    ],
)
def test_rollup(existence, support, integrity, claims, expected):
    assert rollup(existence, support, integrity, has_claims=claims) == expected


def test_score_excludes_errors_and_empty_is_unscored():
    assert summarize(["verified"] * 33 + ["not_found"] * 5 + ["error"] * 2)[1] == 87
    assert summarize(["verified", "partially_verified"])[1] == 75
    assert summarize([])[1] is None
