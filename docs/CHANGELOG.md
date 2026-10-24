# Build changelog

## 2026-10-24 — M4 live existence pipeline verified

- Added deterministic normalization, venue aliases, matching thresholds,
  canonical cache, metadata diffs, identifier resolution, roll-up and score.
  A wrong known year always needs review even if the composite score passes;
  doc 08 now reflects this PRD acceptance rule. The live API's truncated
  `Advances in neural …` venue is recognized as NeurIPS rather than flagged.
- Added asynchronous, idempotent run dispatch and a bounded concurrent pipeline
  for private stored BibTeX/PDF and pasted text. Citations, claims, evidence,
  per-row state, atomic progress, final counts and usage live in Supabase.
  Only the existence phase is connected at M4; linked claims remain
  `unverifiable` and integrity `unknown`, stated in the run stage detail.
- **PASS** 30 worker tests and real signed storage-to-run smoke: actual paper
  → verified, invalid arXiv → not_found, wrong year → needs_review. Each has
  linked evidence with a source URL. Checked count is 3 and score is 33.
  The successful warm run reused two real canonical cache records and made
  one Fetch call; the prior cold run exposed and led to the venue alias fix.
- Smoke runs are private under a synthetic test owner, contain actual provider
  verdicts, and are not public samples. No verification results were invented.
- Empty or all-error runs have no trust score (`null`), avoiding a misleading
  score with no completed checks. Support/integrity/answer/export and the live
  web report remain later milestones; no production acceptance is claimed.

## 2026-10-24 — Hosted database verified; existing Clerk app and worker clients

- Kept the current repository and existing Clerk application. Linked it with
  the Clerk CLI and restored its development keys locally; no `init`, new
  project/application, or test-user creation. Added Google/email auth pages,
  visible sign-in/up/profile controls, Core 3 shadcn styling, and protected
  workspace routes. Each page authenticates at the resource; Next.js 16 proxy
  redirects are supplementary. The user reports successful first sign-in.
- User confirmed the Supabase third-party Clerk connection. CLI domain lookup
  confirms the configured development frontend API domain. End-user JWT and
  Realtime delivery still need a live report to exercise them.
- Normalized the supplied Supabase REST URL to its project root and stored
  modern publishable/server-secret keys only in ignored local env files. The
  existing service JWT was not duplicated. No values are in source or this log.
- Direct Postgres was IPv6-only and unreachable from this host. Used the
  user's actual IPv4 session-pooler connection, inspected the empty public
  schema, and applied migrations 0001–0004 in one committed transaction.
- **PASS M1 hosted readiness.sql and rls.sql**, including enums/tables, RLS,
  private uploads, publication membership, browser write denial, service-only
  RPC, owner/cross-user/sample/anonymous reads, and rollback of test fixtures.
- Implemented M2 settings, all DB enums, typed TinyFish results, Search/Fetch
  batching and rate controls, bounded TTL/LRU caches, three-attempt transient
  retries, per-attempt Supabase usage rows, and throttled per-run counters.
  Paid Agent reservations count failures, enforce per-run/day caps, and never
  auto-retry ambiguous dispatches. No real Agent run has been made.
- Implemented the Gemini provider interface, Pydantic JSON validation, direct
  PDF parts, streaming transport, and token/latency logging. No Google web
  grounding tool is enabled; TinyFish remains the verification web layer.
- The original 2.5 Flash returned HTTP 404. Google's current availability
  notice restricts 2.5 to existing active users. Updated the fast model to
  **gemini-3.8-flash**, which passed live structured-output smoke. The selected
  **gemini-3.1-pro-preview** target returned HTTP 429 after bounded retries;
  Pro quota/access is pending before M6 escalation can be considered verified.
- **PASS M2 live TinyFish Search** (Attention Is All You Need candidate) and
  **Fetch** (arXiv text contains Transformer), with actual `api_usage` rows.
- **PASS M2 worker signing**: real localhost unsigned POST gives 401; signed
  POST gives 202. Start is a documented M2 transport stub, not a working job.
  Ask/export stubs return explicit 501 responses and are not connected to UI.
- Eight client/security tests pass, plus web lint/types/build, input boundary
  tests, offline SQL tests, and formatting. Browser sign-in/up controls and
  protected-route redirection were inspected; no account was impersonated.

### M3 verified with controlled fixtures

- Added BibTeX v2 extraction with LaTeX decoding and original entries retained;
  identifier checks; structured PDF/text extraction; linked-claim validation,
  verbatim text checks, and per-citation claim caps.
- Added controlled parser fixtures with 12 references and claims for [1]/[12].
  These are test inputs, not scientific findings or seeded verification results.
  All 21 offline worker tests pass. **PASS live PDF and text extraction**:
  exactly 12 references, claims linked to [1]/[12], invalid identifier preserved.
  Inspected the rendered PDF for legibility and complete content. The original
  final-demo assets were absent, so this controlled fixture establishes the
  parsing gate; final demo/evaluation acceptance is still pending. The web
  still does not submit live verification jobs.

## 2026-10-24 — Focused frontend flow and hosted-check tooling

- Stored the user-supplied TinyFish credential only in `apps/worker/.env`, with
  owner-only file permissions. It is ignored by Git and not copied into browser
  configuration, templates, docs, or source. Its presence is checked without
  printing the value; API authentication has not yet been exercised.
- Later received Gemini and database credentials and appended them only to
  that ignored worker file, without displaying or reading existing env content.
  Generated matching local worker-signing secrets in the ignored web/worker
  environments. No credential values are included in this changelog or source.
- Replaced the marketing landing page with a direct workspace shell. Removed
  the hero, slogans, method explorer, principles section, and repeated CTAs.
- Added separate input/review steps, an explicit future report/answer step,
  check/question/history navigation, preserved in-tab drafts, Edit/Back actions,
  empty-input guards, and an honest unavailable-live-check state.
- Simplified explanations into a compact checks panel and Help dialog. Kept
  the brand palette, keyboard controls, mobile Sheet navigation, heading focus
  management, and reduced-motion support.
- Extracted document validation and added boundary tests for PDF/BibTeX sizes,
  empty files, extension casing, and unsupported/double extensions.
- Added `pnpm check:setup` for secret-safe configuration presence reporting and
  `pnpm check:hosted` for real hosted readiness/RLS SQL execution over TLS. The
  optional admin DB URL remains local; psycopg is development-only. The checker
  executes the existing rollback-scoped tests and does not apply migrations.
- M1 hosted verification remains pending: the hosted Supabase project URL/API
  keys and Clerk setup are still needed. The user's Clerk checklist requires
  confirmation before changes; their selected existing application will be
  preserved. TinyFish calls must pass through the gateway with usage
  logging; M2/provider implementation is not bypassed by the new credential.
  No paid Agent calls or fabricated verification results were introduced.

### Validation

- Browser walkthrough passed for text input → Review → Edit/Back; question
  review; navigation between views without losing the reference draft; Help
  dismissal with Escape; and mobile menu focus/selection at 375px.
- Checked the primary review action remains visible in a 1280×720 desktop
  viewport; removed the temporary mobile QA route before building.
- Input boundary tests, SQL/RLS tests, web build/lint/TypeScript/Prettier, and
  worker Ruff checks pass. Hosted setup commands correctly report incomplete
  configuration with exit code 2; this is not a claimed hosted test pass.

## 2026-10-24 — M1 Supabase implementation; hosted verification pending

- Pushed the initial project, redesigned frontend, Docker-free setup, and judge
  pitch to `m3hakkaushik/veri_cite` on `main` (`f822f43`).
- Added the first three SQL migrations verbatim from doc 09: all nine enums,
  eight tables, indexes, RLS policies, private uploads bucket, and Realtime
  publication membership.
- Added migration 0004 for the atomic checked-citation increment, restricted
  to `service_role`; doc 09 contains the same SQL and permission contract.
- Added server-only service/user Supabase clients for the BFF, a memoized
  browser client using Clerk third-party-auth session tokens, and a lazy async
  worker client. The public preview still runs without provider keys.
- Added transaction-scoped SQL security tests and hosted readiness assertions.
  Synthetic fixtures roll back and never seed pretend verification outcomes.
- Added Docker-free `pnpm test:db` with PGlite, pgvector, and pgcrypto as dev-only
  dependencies. It executes actual PostgreSQL migrations/RLS with test-only
  Supabase auth/storage interfaces; it is not a local Supabase deployment.

### Verification

- **PASS** migration/doc parity for 0001–0004 and all nine enum value lists.
- **PASS** schema/RLS/private-bucket/publication/RPC catalog assertions.
- **PASS** own-run reads; cross-user isolation for runs, citations, claims,
  evidence, users, and answers; signed-in sample access; anonymous denial;
  backend-only cache/usage access; browser run-write/RPC denial; additive
  service-role progress increments; fixture rollback.
- **PASS** web lint, TypeScript, production build, Prettier, and worker Ruff.
- **PASS** revised worker `/health` with `pdf_parser:"gemini"`.
- **PENDING** apply migrations to a real hosted Supabase project and rerun SQL
  checks there. No Supabase/Clerk keys or project configuration were available
  in the local app environments. Clerk JWT verification, signed-upload
  transport, and Realtime delivery are not validated by the offline harness.
- M1's implementation is ready; its hosted Verify gate remains pending. M2
  provider/checker implementation has not started, following the SOP order.

## 2026-10-24 — Judge pitch and Docker-free architecture

- Added `docs/judges.md`: a 390-word spoken script (roughly 2:40–2:50 at
  140–150 words/minute), walkthrough cues, stack alternatives, feasibility,
  impact measures, limitations, and judge follow-up answers. Current build
  status is explicit; unmeasured targets are not presented as achieved results.
- User directed that Docker not be used. Hosted Supabase remains the database,
  private storage, and Realtime layer; Gemini direct PDF extraction is now the
  primary PDF parser. Updated the architecture, PRD, SOP, engine, environment,
  and API docs plus AGENTS.md to match.
- Removed Compose, the empty parser client, GROBID environment variables,
  parser startup command, and the unused lxml dependency.
- Worker health now returns `{ok:true,pdf_parser:"gemini",version:"0.1.0"}`;
  doc 10 changed in the same update. It does not claim provider readiness.
- The original M0 GROBID gate below is historical and superseded by the user's
  infrastructure decision. M0 is complete under the revised SOP; hosted schema
  and provider smoke checks still require configuration.

## 2026-10-24 — Complete public frontend redesign

User-authorized frontend rebuild after the original M0 preview. This redesign
does not advance the backend milestone gates or change DB/API contracts.

### Changed

- Replaced the original page and its entire layout stylesheet with an editorial
  research-desk design: new hero, source-tracing artwork, sticky navigation,
  inline workspace, interactive method explorer, principles, and closing CTA.
- Preserved the brand tokens, Inter and IBM Plex Mono, and bracket-check mark.
  Kept all artwork code-native; added no dependency or stock imagery.
- Added stateful Document, Paste text, and Ask a question modes with real local
  inputs, file validation, word/character counts, examples, clear controls,
  disabled empty-submit states, and accessible review/help dialogs.
- Added mobile Sheet navigation, keyboard-operated check tabs, focus management,
  short transitions, below-fold reveal behavior, and reduced-motion support.
- Inputs stay in tab memory. Backend availability is explicit throughout; no
  fabricated scores, verification results, flags, or evidence were introduced.
- Updated the current frontend specification in doc 12. The prior M0 progress
  and missing GROBID/backend prerequisites remain recorded below.

### Validation

- Production build, TypeScript, ESLint, and Prettier checks.
- Browser walkthrough: load example → review text → dismiss with Escape;
  question example → question review; method tabs via clicks and arrow keys.
- File selection: valid .bib accepted, empty input rejected, oversized .bib
  rejected with the original valid selection preserved.
- Visual inspection at desktop and a real 375px iframe viewport; mobile menu
  open/close and section navigation checked. Temporary QA route removed before
  delivery.

### Scope

The entire existing public frontend was rebuilt. Live verification, auth,
server uploads, saved history, and real Trust Reports still await their backend
milestones. Nothing is presented as an operational verification run.

## 2026-10-24 — M0 implemented, GROBID verification blocked

### Built

- Initialized Git and a pnpm workspace with `apps/web`. Added secret-safe ignore
  rules, exact dependency pins, pnpm/uv lockfiles, Prettier, ESLint, TypeScript
  strict mode, and Ruff configuration.
- Created the Next.js App Router app with the exact Mist/Plum/Periwinkle brand
  tokens, mapped shadcn semantic variables, Inter and IBM Plex Mono via
  `next/font/google`, the bracket-check SVG mark, and an SVG app icon.
- Added the SOP's shadcn component inventory. Replaced generated black overlays
  with brand Plum; removed blur styling and the generated Geist font.
- Added a responsive product preview with working section navigation, four
  checks, a Grounded Answer introduction, and the five-step evidence trail.
  The page explicitly identifies itself as a preview. It has no invented
  reports, evidence, usage figures, trust scores, or operational verification
  controls. M5's authenticated landing CTAs will replace preview navigation.
- Created the Python 3.12 worker, installed the prescribed dependencies using
  uv, and reserved the module layout from architecture section 4. Only
  `app/main.py` implements behavior at this milestone.
- Added `/health` with the API-spec response `{ok, grobid, version}`. The endpoint
  probes GROBID and works with no service credentials.
- Added private local GROBID Compose configuration (pinned `0.8.1`, loopback
  port binding, 4 GB limit, amd64 emulation for Apple Silicon).
- Added both app `.env.example` templates, root development/check commands,
  app READMEs, and the previously missing `18-env-deployment.md` setup guide.
- Skimmed live TinyFish Search/Fetch/Agent docs and inspected Python SDK
  `tinyfish==0.11.0` signatures without authenticated calls. Updated doc 07
  with the comma-separated SDK domain-filter requirement, per-URL Fetch
  failures, supported Agent arguments, and free-allowance billing behavior.

### Verification

- **PASS** `pnpm --filter web dev`: <http://localhost:3000> returns HTTP 200.
  Browser inspection confirms the Mist background, brand layout, Inter and
  Plex typography, and preview content. Section navigation checked in-browser.
- **PASS** `pnpm lint`, `pnpm typecheck`, `pnpm build` (static production output).
- **PASS** `pnpm format:check`.
- **PASS** `uv run ruff check .` and `uv run ruff format --check .` in worker.
- **PASS** `uv run uvicorn app.main:app --reload --port 8000`, then
  `GET /health` → `{"ok":true,"grobid":false,"version":"0.1.0"}`.
- **PASS** `.env.local`, worker `.env`, `.venv`, and build output are ignored;
  both `.env.example` templates remain eligible for Git.
- **BLOCKED** `docker compose up -d grobid`: `docker` is not installed in this
  environment. Therefore the required `/api/isalive` → `true` check cannot run.
  M0 is **not** marked complete and M1 has **not** started, following the SOP
  rule that later milestones cannot begin with a failing Verify block.

### Gaps and next action

1. Install/start Docker with Compose and at least 4 GB available, then run
   `pnpm dev:grobid` and verify <http://localhost:8070/api/isalive> returns `true`.
   No global machine software was installed by this change.
2. Configure Clerk and Supabase and populate the ignored local environment
   files. Service credentials are needed for M1's applied-schema/RLS checks;
   TinyFish and Gemini credentials are needed for M2's live smoke checks.
3. After M0's final gate passes, continue M1 schema/RLS/storage in SOP order.
4. Original docs `15-demo-and-pitch.md`, `16-testing-evaluation.md`, and demo
   inputs were absent at handoff. No substitute demo results were invented.

### Scope

This is the M0 foundation, not the Phase 1 application. No database schema,
auth integration, upload flow, report, verification checker, grounded-answer
pipeline, production deployment, or sample seed is claimed complete. No
TinyFish/Gemini usage or paid Agent runs were performed.
