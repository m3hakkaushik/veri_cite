# VeriCite `[✓]`

> **Every citation and claim, verified against the live web — with the evidence attached.**

VeriCite is a real-time academic cross-reference and fact-checking engine built on **TinyFish** for **HackIIITD 2026** (IIIT Delhi · Esya '26) by **Team Savencia** (K. R. Mangalam University, Gurgaon — Mehak · Nitesh).

Drop in a draft, a PDF, a `.bib` file, or a question. VeriCite runs **four live checks** on every reference:

| #   | Check        | Question              | TinyFish API                       | Flags                      |
| --- | ------------ | --------------------- | ---------------------------------- | -------------------------- |
| 01  | **Exists**   | Does the paper exist? | Search (`research_paper`)          | Not found · Wrong metadata |
| 02  | **Supports** | Does it say that?     | Fetch                              | Unsupported · Contradicted |
| 03  | **Valid**    | Is it still valid?    | Search → Fetch → Agent             | Retracted · Corrected      |
| 04  | **Current**  | Is it current?        | Search (`news`, `recency_minutes`) | Outdated · Disputed        |

**Grounded Answer mode:** ask a question and the LLM answers _only_ from pages TinyFish fetched seconds ago, with every sentence linked to its source.

---

## Project stages

| Stage       | Deliverable                                                        | Status                                                     |
| ----------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Phase 1** | Next.js web app + Python verification worker (24h hackathon build) | 🟡 M0 scaffold implemented; verification gates in progress |
| **Phase 2** | Flutter mobile app (same backend, share-sheet + camera intake)     | ⚪ After Phase 1                                           |

## Repository layout (target)

```
iiit/
├── AGENTS.md                 # Rules for AI coding agents. Read first.
├── README.md
├── veri cite.pdf             # Round-1 pitch deck (source of truth for the vision)
├── docs/                     # All product + engineering docs (start at docs/00-index.md)
├── apps/
│   ├── web/                  # Next.js (App Router) on Vercel. UI + BFF API (/api/v1)
│   ├── worker/               # FastAPI + TinyFish Python SDK + Gemini. Verification engine
│   └── mobile/               # Flutter app (Phase 2)
├── supabase/                 # SQL migrations, seed, RLS policies
└── eval/                     # Known-real / known-fake / retracted citation test sets
```

## Docs

Start at **[docs/00-index.md](docs/00-index.md)**. If you are an AI agent, read **[AGENTS.md](AGENTS.md)** and then **[docs/00-context.md](docs/00-context.md)**.

For the three-minute presentation, read **[Judge pitch](docs/judges.md)**.
The infrastructure uses **hosted Supabase + Gemini direct PDF extraction**;
no Docker or local parser/database services are required.

## Tech at a glance

Next.js · TypeScript · Tailwind · shadcn/ui · Clerk · Supabase (Postgres, pgvector, Storage, Realtime) · Vercel · FastAPI · **TinyFish (Search, Fetch, Agent)** · Gemini 2.5 Flash · RapidFuzz · Flutter (Phase 2)

## Run locally

```sh
pnpm install --frozen-lockfile
cd apps/worker
uv sync --frozen
```

Then, in separate terminals at the repository root:

```sh
pnpm dev          # http://localhost:3000
pnpm dev:worker   # http://localhost:8000/health
```

The branded product preview and worker health endpoint work without API keys.
Verification is not implemented yet. Copy the app `.env.example` files to
`apps/web/.env.local` and `apps/worker/.env` and configure them locally before
the integrations milestone. See [environment setup](docs/18-env-deployment.md)
and the [build log](docs/CHANGELOG.md) for exact progress and remaining gates.

The Supabase schema, RLS, private uploads, and Realtime migrations are in
[`supabase/migrations`](supabase/migrations). Run `pnpm test:db` for the
Docker-free database tests; see [hosted setup](supabase/README.md) before
applying the SQL to your project. Server, browser, and worker clients are
prepared, but the hosted integration is not claimed verified until configured.

`pnpm check:setup` lists missing configuration names without exposing values.
`pnpm check:hosted` runs the hosted SQL checks after you configure the optional
admin connection in the ignored worker environment. `pnpm test:inputs` covers
document type and size boundaries.
