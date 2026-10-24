"""Citation roll-up and trust-score rules shared by the pipeline and tests."""

from collections import Counter


def rollup(existence: str, support: str, integrity: str, *, has_claims: bool) -> str:
    if existence == "not_found":
        return "not_found"
    if integrity == "retracted":
        return "retracted"
    if support in ("contradicted", "unsupported"):
        return "not_supported"
    if existence == "metadata_mismatch" or integrity in ("corrected", "concern"):
        return "needs_review"
    if support in ("partially_supported", "unverifiable") or (
        integrity == "unknown" and existence == "found" and has_claims
    ):
        return "partially_verified"
    if (
        existence == "found"
        and support in ("supported", "not_applicable")
        and integrity in ("clean", "unknown")
    ):
        return "verified"
    return "error"


def summarize(statuses: list[str]) -> tuple[dict[str, int], int | None]:
    counts = dict(Counter(statuses))
    checked = sum(value for key, value in counts.items() if key != "error")
    if not checked:
        return counts, None
    return counts, round(
        100 * (counts.get("verified", 0) + 0.5 * counts.get("partially_verified", 0)) / checked
    )
