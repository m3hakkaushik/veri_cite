# 04 — PRD: VeriCite Web (Phase 1)

| Field | Value |
|-------|-------|
| Product | VeriCite Web |
| Version | 1.0 (hackathon MVP) |
| Build window | 24 hours (HackIIITD 2026 finale) |
| Owners | Team Savencia |
| Related | [Architecture](05-architecture.md) · [Engine](08-verification-engine.md) · [UI Spec](12-ui-spec.md) · [SOP](13-sop-build-web.md) |

## 1. Goal

Ship a deployed web app where a user can upload a paper (PDF), `.bib`, or pasted text and, within ~2 minutes, get a **Trust Report** that verifies each citation live via **TinyFish**, with evidence and fixes. Also ship **Grounded Answer** Q&A.

### Success criteria for the hackathon
1. Demo script ([15](15-demo-and-pitch.md)) runs end-to-end on deployed URLs.
2. All three TinyFish APIs (Search, Fetch, Agent) are visibly used in the demo.
3. The demo paper's planted fake, misquote, and retracted citations are each caught with evidence.

## 2. Non-goals (Phase 1)
- Plagiarism detection, AI-text detection.
- Batch class uploads, institution dashboards, Chrome extension, public API (P2, pitch only).
- Payments, teams/orgs, multi-language UI.
- Editing the user's original PDF (we export fixes, not modified PDFs).

## 3. Priorities

- **P0** = required for demo. **P1** = build if P0 is done and stable. **P2** = roadmap/pitch only (may have a "coming soon" UI stub).

## 4. Functional requirements

### 4.1 Auth & accounts
| ID | P | Requirement |
|----|---|-------------|
| AUTH-1 | P0 | Sign in / sign up with Clerk (Google + email). Clerk `<SignIn/>` hosted components |
| AUTH-2 | P0 | Protected routes: `/app/**`. Landing `/`, `/r/[shareId]`, `/demo` are public |
| AUTH-3 | P0 | Supabase requests use the Clerk session token (third-party auth); RLS restricts rows to `owner_id = auth.jwt()->>'sub'` |
| AUTH-4 | P1 | User row upserted into `users` on first authenticated request |

### 4.2 Input
| ID | P | Requirement |
|----|---|-------------|
| IN-1 | P0 | **Paste text**: textarea, up to 60k chars. Detects a references section; if none, treats each line that looks like a reference as one |
| IN-2 | P0 | **PDF upload**: drag-drop, ≤ 20 MB, uploaded to Supabase Storage bucket `uploads` via signed URL |
| IN-3 | P0 | **.bib upload**: ≤ 2 MB, parsed server-side |
| IN-4 | P1 | **URL**: arXiv/DOI/paper URL → worker fetches via TinyFish Fetch and treats as document |
| IN-5 | P0 | **Question** (Grounded Answer) — separate tab, see 4.6 |
| IN-6 | P0 | "Try a sample" button loads the demo paper (pre-uploaded) so judges can try without uploading |
| IN-7 | P1 | Check toggles: Exists (always on), Supports, Valid, Current; recency window select (1h, 24h, 7d, 30d) |

### 4.3 Processing & live progress
| ID | P | Requirement |
|----|---|-------------|
| RUN-1 | P0 | Creating a run returns `run_id` immediately (< 1 s); processing is async in the worker |
| RUN-2 | P0 | Run status lifecycle: `queued → parsing → checking → completed` (or `failed`) |
| RUN-3 | P0 | Report page subscribes to Supabase Realtime and updates each citation row as checks finish (no refresh) |
| RUN-4 | P0 | Progress bar: `checked / total` citations; per-row spinner per check |
| RUN-5 | P0 | A 40-reference paper completes in ≤ 3 min cold cache, ≤ 30 s warm cache |
| RUN-6 | P0 | Partial failure tolerance: a failing check marks that check `error` and the run still completes |
| RUN-7 | P1 | TinyFish usage meter on the run: count of Search / Fetch / Agent calls, cache hits |

### 4.4 Verification checks (see [08](08-verification-engine.md) for algorithms)
| ID | P | Requirement |
|----|---|-------------|
| CHK-EXISTS | P0 | For every citation, TinyFish Search `research_paper` + fuzzy match → `found` / `metadata_mismatch` / `not_found`, with matched canonical metadata and field diffs |
| CHK-ID | P0 | Malformed identifiers (`arXiv:2305.XXXX`, invalid DOI pattern) flagged `not_found` with reason "invalid identifier" before any API call |
| CHK-SUPPORT | P0 | For citations with at least one linked claim and a fetchable full text/abstract: TinyFish Fetch → LLM judge → `supported` / `partially_supported` / `unsupported` / `contradicted` / `unverifiable`, with verbatim quote |
| CHK-QUOTE | P0 | "No quote, no supported": quote must fuzzy-match fetched text (`partial_ratio ≥ 90`) or the verdict is downgraded to `unverifiable` |
| CHK-VALID | P0 | Retraction/correction detection: Search + Fetch signals; Agent escalation capped per run → `clean` / `corrected` / `retracted` / `unknown` |
| CHK-CURRENT | P1 | For time-sensitive claims: TinyFish Search `news` with `recency_minutes` → `current` / `outdated` / `disputed` / `no_recent_coverage` |
| CHK-CACHE | P0 | Canonical metadata, full-text URL and integrity result cached in `reference_cache` by DOI/arXiv/title hash (TTL 7 days) |

### 4.5 Trust Report
| ID | P | Requirement |
|----|---|-------------|
| REP-1 | P0 | Header: document name, `N checked · V verified · F flagged`, trust score % |
| REP-2 | P0 | Citation list ordered by index; each row shows `[n]`, formatted reference, one-line reason, status badge |
| REP-3 | P0 | Filter chips: All / Flagged / Verified / Not found / Not supported / Retracted |
| REP-4 | P0 | Clicking a row expands the **Evidence panel**: check-by-check verdicts, verbatim quote (with mismatch highlighted), source link(s), publisher/date, TinyFish API badge |
| REP-5 | P0 | One-click fixes: (a) "Use canonical metadata" for mismatches, (b) "Fix claim to X" when the judge proposes a corrected value, (c) "Remove citation". Fixes are stored in `citations.fix` and reflected in exports |
| REP-6 | P0 | **Export corrected BibTeX** (`.bib` download) including fixes and filled DOIs |
| REP-7 | P1 | **Export PDF report** |
| REP-8 | P1 | **Share link**: generates `share_id`, public read-only `/r/[shareId]` |
| REP-9 | P0 | History: `/app` dashboard lists past runs with status and trust score |

### 4.6 Grounded Answer
| ID | P | Requirement |
|----|---|-------------|
| ASK-1 | P0 | User asks a question (≤ 500 chars) |
| ASK-2 | P0 | Worker plans 2–4 queries, runs TinyFish Search (`web`, `news`, `research_paper` as relevant), fetches top 4–8 pages via TinyFish Fetch |
| ASK-3 | P0 | Answer streams (SSE) as markdown; every sentence ends with `[n]` citations to fetched sources; sources list shows title, domain, published date, fetched-at time |
| ASK-4 | P0 | Sentences whose citation quote can't be validated are removed; if nothing survives, respond "Not enough live evidence found" with the sources tried |
| ASK-5 | P1 | Answers saved to `answers` table and visible in history |
| ASK-6 | P1 | "Verify a claim from this answer" → runs Current check on it |

### 4.7 Landing & demo
| ID | P | Requirement |
|----|---|-------------|
| LND-1 | P0 | Landing page with hero (brand), the four checks, "Try a sample" and "Sign in" CTAs, "Built on TinyFish" badge |
| LND-2 | P1 | Problem stats strip (100 / 18% / 86% / 1 yr / $440K) |

## 5. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | First report row visible ≤ 15 s after upload; full 40-ref run ≤ 3 min cold |
| Reliability | Retries with exponential backoff (3 tries) on TinyFish/Gemini 429/5xx; idempotent run start |
| Cost | Search/Fetch within free tier; Agent ≤ 5 runs per job and ≤ $35 total for the event; Gemini free tier |
| Accuracy | See targets in [16](16-testing-evaluation.md): ghost recall ≥ 95%, false-not-found ≤ 5% |
| Security | RLS on all user tables; service role only server-side; signed upload URLs; worker endpoints require HMAC secret |
| Privacy | Uploaded documents deleted after 7 days (P1 cron); never sent anywhere except Gemini/TinyFish for processing |
| Accessibility | WCAG AA contrast with brand palette; status conveyed by text + icon, not colour alone; keyboard-navigable rows |
| Responsiveness | Works at 375 px width (mobile web) and up |
| Observability | Structured JSON logs in worker with `run_id`; `api_usage` table |

## 6. Acceptance criteria (P0, testable)

1. **Given** the demo PDF, **when** I click "Try a sample", **then** within 3 minutes I see ≥ 1 `verified`, ≥ 1 `not_found`, ≥ 1 `not_supported`, ≥ 1 `retracted` row, each with evidence linking to a real URL.
2. **Given** a citation `arXiv:2305.XXXX`, **then** it is flagged `not_found` with reason "Invalid arXiv identifier" and zero TinyFish calls for it.
3. **Given** "Attention Is All You Need" cited for "based solely on attention mechanisms", **then** status is `verified` and the evidence shows a verbatim quote from arXiv:1706.03762.
4. **Given** a citation whose claim says 40% but the paper says 4%, **then** support is `contradicted`, the quote shows "4%", and a "Fix claim to 4%" button appears.
5. **Given** a known retracted paper (e.g. the 2020 Lancet Surgisphere hydroxychloroquine study), **then** integrity is `retracted` with a link to the retraction notice.
6. **Given** a `.bib` with a wrong year, **then** status is `needs_review` (`metadata_mismatch`), and the exported `.bib` contains the corrected year after "Use canonical metadata".
7. **Given** a question, **then** the streamed answer has `[n]` markers on every sentence and each `[n]` resolves to a fetched source.
8. Refreshing the report page mid-run shows the same state (state lives in Supabase, not memory).
9. User A cannot read User B's runs via the Supabase client (RLS test).

## 7. Analytics (lightweight)
`api_usage` rows per TinyFish/Gemini call; run durations; verdict distribution. Shown on an internal `/app/stats` page (P1) for the pitch.

## 8. Open questions / assumptions
- **Assumption:** TinyFish Search `research_paper` results include `pdf_url` or a landing URL for most papers; if not, we fall back to arXiv/abstract pages via Search `web` + Fetch.
- **Assumption:** Search rate limit ≈ 30 req/min on the free tier (per deck estimate); the scheduler is configurable via `TINYFISH_SEARCH_RPM`.
- **Decision (24 Oct 2026):** Hosted Supabase handles database, uploads, and realtime; Gemini extracts references and claims from PDF bytes directly. No Docker/GROBID service is used.
