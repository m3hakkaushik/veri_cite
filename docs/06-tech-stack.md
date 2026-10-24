# 06 — Tech Stack

> Principle: **boring, free-tier, fast to ship in 24h**, with a credible scale story. TinyFish is mandatory and central.

## Summary

| Layer | Choice | Why | Alternative if blocked |
|-------|--------|-----|------------------------|
| Web framework | **Next.js (latest stable, App Router) + TypeScript** | SSR, route handlers as BFF, first-class on Vercel | — |
| Styling/UI | **Tailwind CSS v4 + shadcn/ui + lucide-react** | Fast, accessible primitives, easy to brand | — |
| Fonts | **Inter** (display/body), **IBM Plex Mono** (code/IDs) via `next/font/google` | Matches the deck | Arimo for body |
| Auth | **Clerk** (`@clerk/nextjs`) | Drop-in auth UI, Google login in minutes, has a Flutter SDK for Phase 2, native Supabase integration | Supabase Auth |
| DB | **Supabase Postgres** + **pgvector** | Managed, RLS, realtime, free tier | Neon |
| Files | **Supabase Storage** (bucket `uploads`, private) | Signed uploads, same project | Vercel Blob |
| Realtime | **Supabase Realtime** (`postgres_changes`) | Live report rows without WebSocket code | Polling every 2 s |
| Hosting web | **Vercel** | Zero-config Next.js | Netlify |
| Worker | **Python 3.12 + FastAPI + uvicorn** | TinyFish Python SDK, BibTeX/RapidFuzz ecosystem | TS worker with `@tiny-fish/sdk` |
| Worker hosting | **Railway** (native Python build) | Long-running background tasks, no Dockerfile required | Another always-on Python host |
| Web access | **TinyFish** — `tinyfish` (Python SDK, `AsyncTinyFish`) | **Mandatory**; Search (structured JSON incl. `research_paper` and `news`), Fetch (browser-rendered → markdown), Agent (goal-driven browser) | — (no alternative allowed) |
| LLM | **Gemini 2.5 Flash** (`google-genai` SDK), **Gemini 2.5 Pro** for escalation | Free tier, fast, 1M context (whole papers fit), native structured JSON output, native PDF input | Groq Llama 3.3 70B via the same `LLMProvider` interface |
| Embeddings (P1) | `gemini-embedding-001` with `output_dimensionality=768` → pgvector | Semantic cache hits on titles | Skip (exact-key cache only) |
| PDF parsing | **Gemini direct PDF input** | Structured references + claims without a separate parser service | Report extraction failure honestly; no fabricated references |
| BibTeX | `bibtexparser` (Python) for parsing; custom writer for export | Reliable | — |
| Fuzzy matching | **RapidFuzz** | Fast C++ fuzzy matching | — |
| HTTP | `httpx` (async) | Supabase/service HTTP and retry handling | — |
| Rate limiting | `aiolimiter` + `asyncio.Semaphore` | Simple token bucket | — |
| Retries | `tenacity` | Exponential backoff on 429/5xx | — |
| Validation | **Zod** (web), **Pydantic v2** (worker) | Contracts | — |
| Supabase clients | `@supabase/supabase-js` (web), `supabase` (Python) | Official | — |
| PDF report (P1) | `@react-pdf/renderer` in a route handler | Server-side PDF from React | Print stylesheet |
| Markdown rendering | `react-markdown` + `remark-gfm` | Grounded answers | — |
| Package mgmt | **pnpm** workspaces, **uv** (Python) | Fast, reproducible | npm / pip-tools |
| Lint/format | ESLint, Prettier, Ruff | Standard | — |
| Testing | Vitest (web unit), Playwright (1 e2e smoke), pytest + pytest-asyncio (worker) | Enough for a hackathon | — |
| Mobile (Phase 2) | **Flutter 3.x**, Riverpod, go_router, `clerk_flutter`, `supabase_flutter`, `dio`, `receive_sharing_intent`, `google_mlkit_text_recognition`, FCM | One codebase iOS/Android, same backend | — |

## Why a separate Python worker (not Next.js API routes)?
1. Verification of a 40-ref paper takes 1–3 minutes; Vercel functions have execution limits and no durable background work.
2. RapidFuzz, bibtexparser and the TinyFish Python SDK are a strong Python ecosystem (the deck already specifies FastAPI + TinyFish Python SDK).
3. Clean scale story: stateless workers behind a queue.

## Why Supabase instead of self-managed Postgres + Redis + Celery (deck)?
For a 24h build, Supabase gives Postgres + pgvector + Storage + Realtime + RLS in one place, and Realtime replaces a custom progress channel. Celery/Redis stays as the **scale path**, not the MVP.

## Versions policy
Use the latest stable versions at build time. Pin exact versions in `package.json` / `pyproject.toml` lockfiles once installed. Do not use canary/beta packages except `clerk_flutter` in Phase 2 if no stable release exists.

## Key packages

### apps/web
```
next react react-dom typescript
@clerk/nextjs
@supabase/supabase-js
tailwindcss @tailwindcss/postcss
shadcn/ui components (button, card, badge, tabs, dialog, sheet, progress, tooltip, dropdown-menu, sonner, skeleton, textarea, input, toggle-group, select)
lucide-react
zod
react-markdown remark-gfm
react-dropzone
@react-pdf/renderer          # P1
server-only
```

### apps/worker (`uv add`)
```
fastapi uvicorn[standard]
tinyfish
google-genai
supabase
pydantic pydantic-settings
httpx
rapidfuzz
bibtexparser
aiolimiter tenacity
sse-starlette
python-multipart
# dev
pytest pytest-asyncio ruff
```
