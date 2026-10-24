# 13 — SOP: Build VeriCite Web (Phase 1)

> **Audience:** AI coding agents (and humans supervising them).
> **Rule:** Execute milestones **in order**. Each milestone ends with a **Verify** block that must pass before moving on. Log progress in `docs/CHANGELOG.md`.
> **Time budget:** 24 h total. Time boxes are guidance; if a milestone overruns by > 50%, cut scope to the P0 core and move on.

## Pre-flight (human, ~20 min, before agents start)

Accounts and keys needed (put into `.env.local` / worker `.env`, see [18](18-env-deployment.md)):
- [ ] TinyFish API key (every team member signed up via the event referral link)
- [ ] Google AI Studio key (Gemini)
- [ ] Clerk application (Google + email enabled) → publishable + secret keys
- [ ] Supabase project (region Mumbai `ap-south-1`) → URL, anon key, service role key, DB password
- [ ] Clerk ↔ Supabase third-party auth connected (steps in [09](09-data-model.md#clerk--supabase-setup-one-time))
- [ ] Vercel account linked to the GitHub repo; Railway account
- [ ] Hosted Supabase project available; no Docker or local Supabase stack is used
- [ ] Demo assets: `eval/demo/thesis_ch2.pdf` + `eval/demo/thesis_ch2.bib` (see [15](15-demo-and-pitch.md#demo-paper))

## Time-box overview

| # | Milestone | Box | Cumulative |
|---|-----------|-----|-----------|
| M0 | Monorepo scaffold | 0:45 | 0:45 |
| M1 | Supabase schema + RLS + storage | 0:45 | 1:30 |
| M2 | Worker skeleton + clients (TinyFish, Gemini, Supabase) | 1:30 | 3:00 |
| M3 | Parsing (bib, Gemini PDF, text) | 2:00 | 5:00 |
| M4 | Exists check + orchestrator + live status | 2:30 | 7:30 |
| M5 | Web: auth, shell, new check, report (live) | 3:00 | 10:30 |
| M6 | Supports check + evidence panel | 2:30 | 13:00 |
| M7 | Integrity check (Search → Fetch → Agent) | 1:30 | 14:30 |
| M8 | Fixes + corrected BibTeX export | 1:00 | 15:30 |
| M9 | Grounded Answer (SSE) | 2:00 | 17:30 |
| M10 | Deploy (Vercel + native Python host + Supabase) + seed sample | 1:30 | 19:00 |
| M11 | P1 features (Current check, PDF export, share, meter polish) | 2:00 | 21:00 |
| M12 | Eval run, demo hardening, freeze | 3:00 | 24:00 |

**Freeze rule:** at hour 21 no new features; only fixes, the demo, and the pitch.

---

## M0 — Monorepo scaffold

**Steps**
1. At repo root: `git init` (if not already), add `.gitignore` (Node, Python, `.env*` except `.env.example`, `.venv`, `.next`, `__pycache__`, `.DS_Store`).
2. `pnpm init`; create `pnpm-workspace.yaml` with `packages: ["apps/web"]`.
3. Create the web app: `pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm`.
4. In `apps/web`: `pnpm dlx shadcn@latest init`, then add components: `button card badge tabs dialog sheet progress tooltip dropdown-menu sonner skeleton textarea input toggle-group select separator collapsible`.
5. Add deps: `@clerk/nextjs @supabase/supabase-js zod lucide-react react-dropzone react-markdown remark-gfm server-only nanoid`.
6. Apply brand tokens to `app/globals.css` exactly as in [11 §3](11-brand-guidelines.md#tailwind-v4-tokens-appswebappglobalscss); fonts via `next/font/google` in `app/layout.tsx`.
7. Create the worker: `mkdir -p apps/worker && cd apps/worker && uv init --python 3.12 --app` then `uv add fastapi "uvicorn[standard]" tinyfish google-genai supabase pydantic pydantic-settings httpx rapidfuzz bibtexparser lxml aiolimiter tenacity sse-starlette python-multipart` and `uv add --dev pytest pytest-asyncio ruff`.
8. Create folder structure exactly as in [05 §4](05-architecture.md#4-worker-internals) with empty modules.
9. Add `.env.example` files for both apps (from [18](18-env-deployment.md)).
10. Use hosted Supabase for Postgres, Storage, and Realtime. PDF extraction goes directly through Gemini; do not add Docker, Compose, or a separate parser service.
11. Root `README.md` already exists; add `docs/CHANGELOG.md` with an "M0 done" entry.

**Verify**
- `pnpm --filter web dev` serves `http://localhost:3000` with Mist background and Inter font.
- `cd apps/worker && uv run uvicorn app.main:app --reload --port 8000` → `GET /health` returns `{ok:true}`.
- `GET /health` identifies `pdf_parser: "gemini"`. No external parser service is required; exercise live PDF extraction in M3.

---

## M1 — Supabase schema, RLS, storage

**Steps**
1. Create `supabase/migrations/` manually for the hosted project. Do not run `supabase start` or install Docker.
2. Write `0001_init.sql`, `0002_rls.sql`, `0003_realtime_storage.sql`, plus the `increment_checked` function exactly from [09](09-data-model.md).
3. Apply to the hosted project: `supabase db push` with an authenticated linked CLI, or paste migrations into the hosted SQL editor in order. Never print credentials or put them into committed files.
4. Create `apps/web/lib/supabase/server.ts` (service-role client, `import "server-only"`), `apps/web/lib/supabase/client.ts` (browser client with Clerk `accessToken`), `apps/worker/app/db.py` (service-role client).
5. Write `supabase/tests/rls.sql` or a small script that, with two fake JWT subs, confirms cross-user reads return 0 rows (can be done post-M5 with two Clerk users).

**Verify**
- Tables and enums exist; `select * from runs` as anon returns 0 rows / permission-filtered.
- Storage bucket `uploads` exists and is private.
- Realtime publication includes `runs`, `citations`, `evidence`.

---

## M2 — Worker skeleton & clients

**Steps**
1. `config.py`: `pydantic-settings` `Settings` with all worker env vars ([18](18-env-deployment.md)) and knobs ([08 §11](08-verification-engine.md#11-config-knobs-env)).
2. `main.py`: FastAPI app, `/health` (liveness plus `pdf_parser: "gemini"`), HMAC dependency `verify_signature(request)` per [10](10-api-spec.md#worker-endpoints-internal), stub routes for `/internal/runs/{id}/start`, `/internal/runs/{id}/bibtex`, `/internal/ask`.
3. `clients/tinyfish.py`: implement `TinyFishGateway` per [07 §5](07-tinyfish-integration.md#5-wrapper-contract-clientstinyfishpy) with `AsyncTinyFish`, limiters, `tenacity` retries, usage logging to `api_usage` and incrementing `runs.tinyfish_usage` (batch these writes every ~2 s to avoid write storms).
4. `clients/llm.py`: `LLMProvider` protocol with `generate_json(prompt, schema: type[BaseModel], model="fast"|"strong", files=None) -> BaseModel` and `stream_text(...)`. Implement `GeminiProvider` using `google-genai` with `response_mime_type="application/json"` and `response_schema`. Log usage to `api_usage` (provider `gemini`).
5. `clients/llm.py`: support direct `application/pdf` byte parts for structured PDF extraction. No separate parser client.
6. `models.py`: Pydantic models + `StrEnum`s mirroring every enum in [09](09-data-model.md#enums).
7. Smoke script `scripts/smoke_tinyfish.py`: search_papers("Attention Is All You Need", 2017), fetch(["https://arxiv.org/abs/1706.03762"]), print results.

**Verify**
- `uv run python scripts/smoke_tinyfish.py` prints a hit with title ≈ "Attention Is All You Need" and fetched page text containing "Transformer".
- A request to `/internal/runs/x/start` without a signature → 401; with a valid signature → 202.
- Gemini smoke: `generate_json` returns a valid Pydantic object for a toy schema.

---

## M3 — Parsing

**Steps**
1. `parsing/identifiers.py`: DOI/arXiv regexes, placeholder detection, year plausibility ([08 §3](08-verification-engine.md#3-identifier-pre-check-no-api-cost)). Unit tests with `arXiv:2305.XXXX`, `1706.03762`, `10.1016/S0140-6736(20)31180-6`.
2. `parsing/bib.py`: bibtexparser → `ParsedRef[]` (LaTeX cleanup, authors split on ` and `).
3. `parsing/pdf.py`: download PDF bytes from private Supabase Storage through the worker client; use Gemini structured output for references and claims. Preserve raw text, resolve citation indices, and report parsing failures explicitly.
4. `parsing/text.py`: Gemini extraction with `extract_v1.md`.
5. Claim linking + time-sensitivity flags through the LLM extraction schema. Enforce caps.
6. Unit tests with fixtures in `apps/worker/tests/fixtures/` (a 5-entry `.bib`, a short pasted text, the demo PDF).

**Verify**
- `uv run pytest -k parsing` green.
- Demo PDF → exact expected reference count and ≥ 1 claim for refs [1], [12].

---

## M4 — Exists check, orchestrator, live status

**Steps**
1. `engine/matching.py`: normalisation + scoring + venue aliases ([08 §4](08-verification-engine.md#4-check-01--exists)). Unit tests: exact match, year off by one, swapped author, fabricated title.
2. `checks/exists.py`: `ExistenceChecker.check(ref, run_id) -> ExistenceResult` incl. cache read/write and evidence.
3. `engine/verdict.py`: roll-up rules + trust score ([08 §8](08-verification-engine.md#8-roll-up-status--trust-score)) with unit tests (33/38 → 87).
4. `engine/orchestrator.py`: `run_pipeline(run_id)`:
   - load run → `status=parsing`, `started_at` → parse → insert citations (`status=pending`) + claims → `total_citations`, `status=checking`, `stage_detail`.
   - identifier pre-check → Exists for all (Semaphore) → per citation: compute status with available checks, update row, `increment_checked`.
   - (M6/M7 add Supports/Integrity phases.)
   - finalize counts, trust score, `status=completed`, `completed_at`. Wrap everything: on exception → `status=failed`, `error`.
5. Wire `/internal/runs/{id}/start` → `asyncio.create_task(run_pipeline(id))` with idempotency guard and a module-level registry of running tasks.

**Verify**
- Insert a run manually with `input_type=bib` and a storage file; call start; watch rows update in the Supabase table editor; run completes; fabricated entries → `not_found`, real ones → `verified` (support `not_applicable` for bib-only).

---

## M5 — Web: auth, shell, new check, live report

**Steps**
1. Clerk: wrap `app/layout.tsx` in `<ClerkProvider>`; `middleware.ts` with `clerkMiddleware()` protecting `/app(.*)` and `/api/v1/(?!health|share).*`; sign-in/up pages.
2. `lib/supabase/client.ts`: `createClient(URL, ANON, { accessToken: async () => (await clerk.session?.getToken()) ?? null })` inside a `useSupabase()` hook.
3. `lib/contracts.ts` (types from [10](10-api-spec.md#shared-types-typescript-appsweblibcontractsts)) + Zod schemas + `toApi` mappers.
4. `lib/worker.ts`: `callWorker(path, body)` that signs with HMAC (`crypto.createHmac`).
5. Route handlers: `POST /api/v1/uploads/sign`, `POST /api/v1/runs`, `POST /api/v1/runs/sample`, `GET /api/v1/runs`, `GET /api/v1/runs/[id]`, `DELETE /api/v1/runs/[id]`, `GET /api/v1/health`. Upsert the `users` row from Clerk `currentUser()` on run creation.
6. Pages: landing (P0 sections 1, 3, 5 first), `/app` dashboard, `/app/new`, `/app/runs/[id]` per [12](12-ui-spec.md). Components from the inventory.
7. Realtime hook `useRunLive(runId, initial)` with the polling fallback.
8. `/demo` page server-rendered from the sample run (service role, read-only).

**Verify**
- Sign in with Google → upload the demo `.bib` → redirected to the report → rows flip from Checking to verdicts **without refresh** → trust score appears at completion.
- Refresh mid-run keeps state. Second user cannot see the first user's run (RLS).
- Lighthouse accessibility ≥ 90 on the report page.

---

## M6 — Supports check + evidence panel

**Steps**
1. `checks/supports.py`: URL choice, batched Fetch (group all citations' URLs into ≤ 10 per call), truncation/section selection, judge prompt `judge_support_v1.md`, **quote verification**, Pro escalation, abstract-only capping ([08 §5](08-verification-engine.md#5-check-02--supports)).
2. Insert `evidence` rows (check `support`, api `fetch`) per claim, set `claims.support`, `claims.suggested_fix`, citation-level `support`.
3. Orchestrator: phase 2 after Exists; recompute status per citation as support completes.
4. Web: `EvidencePanel` Supports section, `QuoteBlock` with token diff highlighting, `ApiBadge`.

**Verify**
- Demo ref [1] (Vaswani) → `supported` with a verbatim quote present on the arXiv page.
- Demo misquote ref → `contradicted`, `suggestedFix` `{find:"40%", replace:"4%"}`.
- Unit test: a fabricated quote not in the text → `unverifiable`.

---

## M7 — Integrity check

**Steps**
1. `checks/integrity.py` implementing the flow in [08 §6](08-verification-engine.md#6-check-03--integrity-retractions--corrections) incl. `escalate()` using `agent_retraction()` with per-run and daily caps.
2. Cache results by DOI in `reference_cache.integrity*`.
3. Orchestrator: run in parallel with Supports for found citations.
4. Web: Still-valid section with notice details and "Checked by Agent API" badge.

**Verify**
- The demo's retracted paper (Lancet 2020 Surgisphere HCQ study, DOI `10.1016/S0140-6736(20)31180-6`) → `retracted` with a notice URL.
- A clean classic paper → `clean`. Agent call count ≤ cap (check `api_usage`).

---

## M8 — Fixes + corrected BibTeX

**Steps**
1. BFF `POST/DELETE /api/v1/runs/[id]/citations/[cid]/fix` (owner check, service role write to `citations.fix`).
2. Worker `engine/bibtex.py` + `/internal/runs/{id}/bibtex` per [08 §10](08-verification-engine.md#10-corrected-bibtex).
3. BFF `GET /api/v1/runs/[id]/export/bib` streams the worker output as an attachment `vericite-<title>.bib`.
4. UI buttons: Use canonical metadata · Fix claim to X · Remove · Undo · Export BibTeX.

**Verify**
- Wrong-year `.bib` entry → apply canonical → exported `.bib` has the corrected year and a filled DOI. Not-found entries are commented with a reason.

---

## M9 — Grounded Answer

**Steps**
1. Worker `answer/grounded.py`: plan (`answer_plan_v1.md`) → parallel searches → dedupe URLs → one Fetch batch (≤ 8) → compose (`answer_compose_v1.md`, JSON sentences) → validate quotes → emit SSE events per [10](10-api-spec.md#ask-sse-events-worker--bff--client-passed-through-unchanged) with `sse-starlette` → save to `answers`.
2. BFF `POST /api/v1/ask`: auth, rate limit, sign, `fetch(worker, { body })`, and return `new Response(upstream.body, { headers: { "Content-Type": "text/event-stream" } })`. Set `export const runtime = "nodejs"` and `maxDuration = 60`.
3. UI `/app/ask` per [12 §2.5](12-ui-spec.md#25-grounded-answer-appask).

**Verify**
- Ask "What did the Lancet do about the 2020 hydroxychloroquine Surgisphere study?" → answer mentions the retraction with [n] chips that resolve to fetched sources; every sentence has a citation.
- A nonsense question → "Not enough live evidence found".

---

## M10 — Deploy + seed sample

**Steps**
1. **Supabase**: use the hosted project with private uploads, Clerk third-party auth, schema/RLS migrations, and Realtime enabled.
2. **Worker**: deploy with a native Python build (`uv sync --frozen`, `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`); set env vars and keep one instance always on. No Dockerfile or parser container.
3. **Web**: Vercel project with root `apps/web`, env vars, Clerk production/dev instance domains updated; Supabase third-party auth domain matches the Clerk instance used.
4. Run the demo paper once on production → mark that run `is_sample=true`, owner `user_sample` (SQL) → `/demo` works.
5. Pre-warm the cache with the demo `.bib` and the eval sets.

**Verify**
- Full J1 journey on production URLs from a fresh browser profile in < 3 min.
- `/api/v1/health` returns `{ ok: true, worker: true }`.

---

## M11 — P1 features (only if M0–M10 verified)

Priority order: (1) TinyFish usage meter polish · (2) **Current** check ([08 §7](08-verification-engine.md#7-check-04--currency-p1)) + UI section + check toggles · (3) Share link + `/r/[shareId]` · (4) PDF export · (5) Link input · (6) `/how-it-works` page · (7) Agent live stream view.

**Verify** each feature against its PRD row in [04](04-prd-web.md).

---

## M12 — Evaluation, hardening, freeze

1. Run `eval/run_eval.py` ([16](16-testing-evaluation.md)) against production; record metrics in `docs/CHANGELOG.md` and the pitch.
2. Fix top failure modes (threshold tuning in `matching.py`, venue aliases).
3. Demo rehearsal ×3 using [15](15-demo-and-pitch.md); record a 90-second backup screen capture of a successful run.
4. Freeze: tag `v1.0-hackathon`.

---

## Troubleshooting playbook

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Realtime not updating | Table not in publication / RLS blocks / Clerk token missing on the channel | Re-run 0003; check the `requesting_user_id()` policy; ensure the client uses `accessToken`; fallback polling kicks in |
| 401 from Supabase with Clerk token | Third-party auth not configured for this Clerk instance (dev vs prod) | Add the correct Clerk domain in Supabase |
| TinyFish 429 | Exceeding Search RPM | Lower `TINYFISH_SEARCH_RPM`, ensure cache hits, check for duplicate queries |
| Everything "not_found" | Title parsing broken or the response field names differ | Log raw Search JSON, compare against the SDK model, fix mapping |
| Quote verification always fails | Normalisation mismatch (ligatures, hyphenation in PDFs) | Normalise `ﬁ→fi`, remove soft hyphens and line-break hyphens before matching |
| PDF extraction fails | Malformed/unsupported PDF or Gemini error | Return an explicit parsing failure; offer pasted text or BibTeX instead |
| Vercel SSE cut off | Function timeout | `maxDuration = 60`, keep answers short, stream early `status` events |
| Run stuck in `checking` | Worker restarted | Startup task marks stale runs failed; user clicks Retry |
