# VeriCite `[✓]`

> **Every citation and claim, verified against the live web — with the evidence attached.**

VeriCite is a real-time academic cross-reference and fact-checking engine built on **TinyFish** for **HackIIITD 2026** (IIIT Delhi · Esya '26) by **Team Savencia** (K. R. Mangalam University, Gurgaon — Mehak · Nitesh).

The planned Phase 1 product accepts drafts, PDFs, BibTeX, and questions. Its four checks are:

| #   | Check        | Question              | TinyFish API                       | Flags                      |
| --- | ------------ | --------------------- | ---------------------------------- | -------------------------- |
| 01  | **Exists**   | Does the paper exist? | Search (`research_paper`)          | Not found · Wrong metadata |
| 02  | **Supports** | Does it say that?     | Fetch                              | Unsupported · Contradicted |
| 03  | **Valid**    | Is it still valid?    | Search → Fetch → Agent             | Retracted · Corrected      |
| 04  | **Current**  | Is it current?        | Search (`news`, `recency_minutes`) | Outdated · Disputed        |

**Planned Grounded Answer mode:** ask a question and the LLM answers _only_ from pages TinyFish fetched seconds ago, with every sentence linked to its source.

---

## Project stages

| Stage       | Deliverable                                                        | Status                                                       |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Phase 1** | Next.js web app + Python verification worker (24h hackathon build) | 🟡 M0–M4 verified; authenticated web walkthrough in progress |
| **Phase 2** | Flutter mobile app (same backend, share-sheet + camera intake)     | ⚪ After Phase 1                                             |

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

Next.js · TypeScript · Tailwind · shadcn/ui · Clerk · Supabase (Postgres, pgvector, Storage, Realtime) · Vercel · FastAPI · **TinyFish (Search, Fetch, Agent)** · Gemini 3.8 Flash · RapidFuzz · Flutter (Phase 2)

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

Configure the ignored web/worker env files from their `.env.example` templates.
The frontend needs Clerk and Supabase settings; the worker needs TinyFish,
Gemini, Supabase, and a shared signing secret. See [setup](docs/18-env-deployment.md).

The current build has hosted schema/RLS/storage checks, existing Clerk auth,
live PDF/text extraction, BibTeX parsing, TinyFish existence checks, persisted
jobs/evidence/progress, and a connected report/history UI. M5's authenticated
web walkthrough is in progress. Claim support, integrity, fixes/exports,
Grounded Answer, final sample, and production deployment are still pending.
See [the build log](docs/CHANGELOG.md) for verified scope.

Run `pnpm test:db` for Docker-free PostgreSQL/RLS tests. The migrations also
passed the hosted SQL checks. See [database setup](supabase/README.md).

`pnpm check:setup` lists missing configuration names without exposing values.
`pnpm check:hosted` runs the hosted SQL checks after you configure the optional
admin connection in the ignored worker environment. `pnpm test:inputs` covers
document type and size boundaries.
