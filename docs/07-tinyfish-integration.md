# 07 — TinyFish Integration (mandatory)

> TinyFish powers every check — **three APIs, one pipeline**. This doc is the single source of truth for how we call TinyFish. All calls go through `apps/worker/app/clients/tinyfish.py`.

> [!IMPORTANT]
> Before coding, an agent must skim the live docs at `https://docs.tinyfish.ai` (Search, Fetch, Agent, Python SDK) and confirm field names. If a field below differs from the SDK, **the SDK wins** — update this doc in the same commit.

## 1. Setup

```bash
cd apps/worker
uv add tinyfish           # Python 3.11+ required
export TINYFISH_API_KEY=...   # from https://agent.tinyfish.ai/api-keys
```

```python
from tinyfish import AsyncTinyFish
client = AsyncTinyFish()   # reads TINYFISH_API_KEY
```

### SDK compatibility check — 24 October 2026

M0 installed and inspected `tinyfish==0.11.0` against the live
[Search](https://docs.tinyfish.ai/search-api/reference),
[Fetch](https://docs.tinyfish.ai/fetch-api/reference), and
[Agent](https://docs.tinyfish.ai/agent-api/reference) references.
`AsyncTinyFish.search.query`, `fetch.get_contents`, and `agent.run` are available.
The gateway accepts `include_domains: list[str]`, but **the Python SDK expects
a comma-separated string**: pass `include_domains=",".join(domains)` at the SDK
boundary. Do not pass the lists in the illustrative table directly to the SDK.
Fetch returns successful pages in `results` and per-URL failures in `errors`;
HTTP 200 alone does not mean every URL succeeded. Agent accepts
`browser_profile="lite"`; there is no top-level `max_steps` argument in this
SDK version. A max-step setting must not be guessed.

Search and Fetch have daily free allowances; beyond them, usage may draw from
the wallet. Handle HTTP 402 without retrying or escalating to Agent. M0 made
no authenticated API calls and spent no TinyFish credits.

REST equivalents (for debugging with curl): Search `GET https://api.search.tinyfish.ai?query=...` · Fetch `POST https://api.fetch.tinyfish.ai` · header `X-API-Key: $TINYFISH_API_KEY`.

## 2. Which API answers which question

| Check | API | Call (shape) | Output we use |
|-------|-----|--------------|---------------|
| **01 Exists?** | **Search** | `search.query(query=title, domain_type="research_paper", pub_year_min=y-1, pub_year_max=y+1, purpose=...)` | `title, authors, year, venue, url, pdf_url, cited_by_count, snippet` |
| 01 fallback | Search | `search.query(query=f'"{title}" {first_author}', domain_type="web", include_domains=SCHOLARLY_DOMAINS, purpose=...)` | URL + snippet for landing page |
| ID check | Fetch | `fetch.get_contents(urls=["https://arxiv.org/abs/{id}"] or ["https://doi.org/{doi}"])` | page title to confirm the ID resolves to the cited title |
| **02 Supports?** | **Fetch** | `fetch.get_contents(urls=[pdf_url or landing_url, ...≤10], format="markdown", purpose=...)` | full text markdown → LLM judge → verbatim quote |
| **03 Valid?** (step 1) | Search | `search.query(query=f'"{title}" retraction OR retracted OR "expression of concern" OR correction', domain_type="web", include_domains=INTEGRITY_DOMAINS + [publisher_domain], purpose=...)` | snippets containing retraction signals |
| 03 (step 2) | Fetch | `fetch.get_contents(urls=[f"https://doi.org/{doi}"], format="markdown")` | landing page text, keyword + LLM classification |
| 03 (step 3, escalation) | **Agent** | `agent.run(url=doi_url, goal=RETRACTION_GOAL, ...)` | structured JSON `{status, notice_url, notice_date, notice_title}` |
| **04 Current?** | **Search** | `search.query(query=claim_query, domain_type="news", recency_minutes=window, purpose=...)` | dated articles, publishers, URLs → Fetch top 3 → LLM judge |
| **Grounded Answer** | Search + Fetch | 2–4 `search.query` (web/news/research_paper) → 1 batched `fetch.get_contents` (≤ 8 URLs) | pages for answer synthesis |

### Domain lists (config, not hard-coded in logic)

```python
SCHOLARLY_DOMAINS = ["arxiv.org", "semanticscholar.org", "openreview.net", "aclanthology.org",
    "proceedings.neurips.cc", "papers.nips.cc", "dl.acm.org", "ieeexplore.ieee.org",
    "link.springer.com", "sciencedirect.com", "nature.com", "pubmed.ncbi.nlm.nih.gov",
    "ncbi.nlm.nih.gov", "jstor.org", "wiley.com", "tandfonline.com", "plos.org", "biorxiv.org", "medrxiv.org"]
INTEGRITY_DOMAINS = ["retractionwatch.com", "retractiondatabase.org", "pubpeer.com",
    "thelancet.com", "nejm.org", "nature.com", "sciencedirect.com", "springer.com", "wiley.com", "plos.org"]
```

### `purpose` strings (always set — they improve result quality)
- Exists: `"Verify that this academic paper exists and get its exact title, authors, year and venue."`
- Supports: `"Read the full text of this paper to check whether it supports a specific claim."`
- Integrity: `"Find any retraction, correction or expression-of-concern notice for this paper."`
- Currency: `"Find the most recent news coverage to check whether this claim is still accurate."`
- Answer: `"Gather current, citable sources to answer this question factually."`

## 3. Agent API — retraction escalation

Agent runs are **metered (credits)**. Team budget ≈ **$35**. Use only when:
1. The citation has a DOI or publisher landing URL, **and**
2. Step 1/2 produced an **ambiguous** signal (e.g. word "retract" appears but the LLM classifier confidence < 0.7, or the landing page is a JS shell / blocked in Fetch), **and**
3. Run budget remains (`AGENT_MAX_RUNS_PER_JOB`, default **5**) and global budget remains (`AGENT_DAILY_CAP`, default **60**), **and**
4. No fresh cache entry for this DOI.

```python
RETRACTION_GOAL = (
  "You are on a scholarly article page. Determine whether this article has been RETRACTED, "
  "CORRECTED (erratum/corrigendum), or has an EXPRESSION OF CONCERN. Look for banners, notices, "
  "'Retracted' labels, linked retraction notices, and the article's 'updates' section. Do not log in. "
  "Return JSON: {\"status\": \"retracted|corrected|concern|clean|unknown\", "
  "\"notice_url\": string|null, \"notice_date\": string|null, \"notice_title\": string|null, "
  "\"evidence_text\": string|null}"
)
result = await client.agent.run(url=doi_url, goal=RETRACTION_GOAL)  # lite browser profile; cap steps if SDK supports (e.g. max_steps≈25)
```

For the demo, also expose `agent.stream()` (SSE) on the evidence panel ("Watch the agent check the publisher page") **only if time allows (P1)** — it's a strong visual for judges.

## 4. Rate limits & scheduling

| API | Limit we design for | Our control |
|-----|---------------------|-------------|
| Search | **30 req/min** (free tier; higher daily caps) → configurable `TINYFISH_SEARCH_RPM` | `AsyncLimiter(TINYFISH_SEARCH_RPM, 60)` |
| Fetch | ≤ **10 URLs per request**; free tier daily URL quota | Batch URLs into groups of 10; `Semaphore(TINYFISH_FETCH_CONCURRENCY=3)` |
| Agent | Metered | `Semaphore(2)`, per-run + daily caps |

**Throughput estimate:** a 40-reference paper needs ~40 Search (exists) + ~10 Search (integrity, only where a DOI/publisher exists and the cache misses) + ~4–5 Fetch calls (batched) → ≈ **2 minutes** at 30 searches/min with a cold cache, seconds when warm.

**Pre-warm before the demo:** run the demo paper once so the shared cache is hot, then show a **cold** run with a different paper only if time permits.

## 5. Wrapper contract (`clients/tinyfish.py`)

```python
class TinyFishGateway:
    async def search_papers(self, title: str, year: int | None, run_id: str) -> list[PaperHit]: ...
    async def search_web(self, query: str, *, include_domains: list[str] | None, run_id: str) -> list[WebHit]: ...
    async def search_news(self, query: str, *, recency_minutes: int, run_id: str) -> list[NewsHit]: ...
    async def fetch(self, urls: list[str], *, run_id: str, purpose: str) -> dict[str, FetchedPage | FetchError]: ...
    async def agent_retraction(self, url: str, *, run_id: str) -> AgentRetractionResult | None: ...
```

Every method MUST:
1. Acquire the right limiter/semaphore.
2. Retry with `tenacity` (3 attempts, exponential backoff 1→8 s, retry on 429/5xx/timeouts).
3. Check/write `reference_cache` where applicable (Search-by-title results keyed by normalized title + year; Fetch by URL with 24 h TTL in-memory LRU; Agent by DOI).
4. Insert an `api_usage` row: `{run_id, provider:"tinyfish", api:"search|fetch|agent", units, cache_hit, latency_ms, ok}`.
5. Return typed Pydantic objects; never leak raw SDK objects into checkers.
6. Store the raw JSON of evidence-producing calls in `evidence.raw` (truncated to 20 KB).

## 6. Showing TinyFish to the judges (UI)
- Every evidence item carries a badge: `Search API`, `Fetch API`, or `Agent API` (styled like the deck's "Engine" slide).
- Run header shows a **TinyFish meter**: `Search 41 · Fetch 5 · Agent 2 · Cache hits 12`.
- `/how-it-works` (P1) page reproduces the deck's "Engine" slide with live counts.

## 7. Failure handling

| Failure | Behaviour |
|---------|-----------|
| Search returns 0 results | Try the web fallback with `include_domains`; still none → `not_found` with "searched: …" listed in evidence |
| Fetch fails / paywall / only abstract | Use the abstract if available → support verdict capped at `partially_supported`; status `partially_verified`. If nothing → `unverifiable` |
| 429 after retries | Requeue the citation at the end with a 20 s delay (max 2 requeues), then `error` |
| Agent budget exhausted | Integrity = `unknown` with note "deep check skipped (budget)"; never block the run |
| TinyFish outage | Run fails gracefully with a banner; the demo uses the pre-warmed cache |
