# AGENTS.md — Operating rules for AI coding agents

You are building **VeriCite**, a live citation & claim verification engine, for a **24-hour hackathon** (HackIIITD 2026, powered by TinyFish). Speed matters, but a broken demo loses. Optimise for: **working end-to-end demo > breadth of features > code elegance**.

## 0. Read order (mandatory before writing code)

1. `docs/00-context.md` — one-page context, locked decisions, glossary
2. `docs/04-prd-web.md` — what to build (P0 / P1 / P2)
3. `docs/05-architecture.md` — how pieces connect
4. `docs/07-tinyfish-integration.md` — **TinyFish is mandatory; follow exactly**
5. `docs/08-verification-engine.md` — algorithms, thresholds, prompts, verdicts
6. `docs/09-data-model.md` + `docs/10-api-spec.md` — contracts (do not drift)
7. `docs/13-sop-build-web.md` — the step-by-step build procedure. **Execute milestones in order.**
8. `docs/11-brand-guidelines.md` + `docs/12-ui-spec.md` — when building UI

## 1. Non-negotiables

- **Infrastructure decision (24 Oct 2026, user-directed):** use hosted Supabase for Postgres, private uploads, and Realtime; Gemini handles direct PDF extraction. Do not add Docker, Compose, GROBID, or a local Supabase stack. The former GROBID verification gate is removed; hosted-service checks still need real credentials and must be reported honestly.
- **TinyFish is the only web access layer** for verification (search, page fetch, browser agent). Do not swap in SerpAPI, Tavily, Firecrawl, raw `requests` scraping, etc. Optional *secondary* signals (Crossref/OpenAlex) are allowed **only** behind the `ENABLE_SECONDARY_SIGNALS` flag and never replace a TinyFish call.
- **No quote, no "supported".** A claim can be marked `supported` only if the LLM returns a verbatim quote that is then found in the fetched text by fuzzy match (≥ 90 `partial_ratio`). Otherwise downgrade to `unverifiable`.
- **Never invent data in the UI.** Every flag must link to an `evidence` row with a `source_url`.
- **Agent API costs credits** (team has ~$35). Use it only through `IntegrityChecker.escalate()` with the per-run cap (`AGENT_MAX_RUNS_PER_JOB`, default 5) and the cache. Search and Fetch are free-tier; still respect the rate limiter.
- **Contracts are law.** DB schema (`supabase/migrations`), enum values, and API shapes in `docs/09` and `docs/10` must match code exactly. If you must change one, update the doc in the same change.
- **Secrets** live in env vars only. Never commit `.env*` (except `.env.example`). The Supabase **service role key** is only used in `apps/worker` and Next.js server-only code (`import "server-only"`).
- Use the **brand tokens** from `docs/11-brand-guidelines.md`. No random Tailwind colours.

## 2. Tooling conventions

| Area | Rule |
|------|------|
| JS package manager | `pnpm` (workspace at repo root) |
| Python | 3.12, managed with `uv` inside `apps/worker` (`uv add`, `uv run`). Never global `pip install`. |
| Next.js | App Router, TypeScript strict, Server Components by default, `"use client"` only where needed |
| Styling | Tailwind CSS v4 + shadcn/ui, tokens from brand doc |
| Validation | Zod (TS), Pydantic v2 (Python) |
| Lint/format | ESLint + Prettier (web), Ruff (worker) |
| Naming | DB `snake_case`; TS `camelCase` vars / `PascalCase` components; enum string values `snake_case` |
| Commits | Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`) |

## 3. How to work

- Work milestone by milestone from `docs/13-sop-build-web.md`. After each milestone, run its **Verify** block. Do not start the next milestone with a failing verify.
- Prefer boring, proven libraries. Don't add a dependency for something that is < 30 lines.
- Every TinyFish/Gemini call goes through the wrapper modules (`apps/worker/app/clients/tinyfish.py`, `apps/worker/app/clients/llm.py`) so we get rate-limiting, caching, retries, and usage logging for free.
- Log TinyFish usage to `api_usage` — the UI shows a live "TinyFish calls" meter (judges score TinyFish usage).
- When something is ambiguous, choose the option that makes the **demo flow in `docs/15-demo-and-pitch.md`** work, and leave a `// DECISION:` comment.
- Keep a running `docs/CHANGELOG.md` of what was built and any deviations.

## 4. Definition of done (whole Phase 1)

The demo script in `docs/15-demo-and-pitch.md` runs end-to-end on the **deployed** URLs (Vercel + worker host) with a cold cache in under 3 minutes, and all P0 acceptance criteria in `docs/04-prd-web.md` pass.
