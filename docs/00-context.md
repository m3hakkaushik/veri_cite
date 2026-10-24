# 00 — Project Context (read this first)

## One-liner

**VeriCite** checks every citation and claim in a document against the **live web** using **TinyFish**, and returns a **Trust Report** where every flag comes with the evidence (a quoted passage and a source link).

## The event

- **HackIIITD 2026** — national 24-hour hackathon by Tech Council, IIIT Delhi, at Esya '26 (24–25 Oct 2026). Presented by **TinyFish**.
- **TinyFish API integration is mandatory.** Projects without it are not considered.
- Finale judging focus: **execution, innovation, scalability, TinyFish API usage, overall impact.**
- Chosen problem statement: *Real-Time Academic Cross-Reference & Fact-Checking Engine* — researchers and students can't verify scientific assertions or breaking news against live web context, which causes hallucinated references. TinyFish Search returns stable, structured JSON; feeding live web data back into the LLM grounds answers and bypasses frozen model knowledge.
- Team **Savencia**, K. R. Mangalam University, Gurgaon — Mehak, Nitesh.

## The problem in one breath

LLMs answer from frozen training data, and nothing checks their references against the live web. ~100 hallucinated citations made it into accepted NeurIPS 2025 papers past 3+ reviewers. Plagiarism tools can't catch it — a fake reference is "original" text. arXiv now bans submitters for a year for unchecked AI content.

## Locked decisions

| Topic | Decision |
|-------|----------|
| Stages | **Phase 1:** Next.js web app (24h). **Phase 2:** Flutter mobile app on the same backend |
| Frontend | Next.js (App Router, TS) + Tailwind v4 + shadcn/ui, deployed on **Vercel** |
| Auth | **Clerk** (web + Flutter), integrated with Supabase via Clerk as a Supabase third-party auth provider |
| Database / storage / realtime | **Supabase** (Postgres + pgvector, Storage for uploads, Realtime for live progress) |
| Verification engine | **Python FastAPI worker** (`apps/worker`) using the **TinyFish Python SDK** (`AsyncTinyFish`), hosted on **Railway** (fallback: GCP Cloud Run with CPU always allocated) |
| Web access | **TinyFish Search, Fetch, Agent** — nothing else for verification |
| LLM | **Gemini 2.5 Flash** default (claim extraction, judge, grounded answers); **Gemini 2.5 Pro** escalation for low-confidence judgements. Behind a provider interface |
| Parsing | `.bib` → `bibtexparser`; PDF → **Gemini direct PDF extraction**; hosted **Supabase Storage** for uploads (no Docker); plain text → Gemini |
| Fuzzy matching | **RapidFuzz** |
| Jobs | MVP: FastAPI background tasks + asyncio semaphore/rate limiter, progress written to Supabase. Scale path: Redis queue + stateless workers |
| BFF | Next.js `/api/v1/*` route handlers are the single public API, used by web and later Flutter |
| Monorepo | `apps/web`, `apps/worker`, `apps/mobile`, `supabase/`, `eval/` |

## Scope (Phase 1)

- **P0 (must demo):** Exists, Supports, Retracted checks · Trust Report with evidence · corrected BibTeX export · Grounded Answer mode · inputs: paste text, PDF, `.bib`
- **P1 (if time):** "Is it current?" news check · PDF report export · public share link · TinyFish usage meter
- **P2 (pitch only / roadmap):** batch class check + institution dashboard · Chrome extension · public API · watch mode (re-check for new retractions)

## Glossary

| Term | Meaning |
|------|---------|
| **Run** | One verification job over one input (document or question) |
| **Citation** | One bibliography entry being verified (DB table `citations`; `references` is a reserved word) |
| **Claim** | A sentence in the document that relies on a citation (or a time-sensitive uncited assertion) |
| **Evidence** | A stored proof item: source URL, quote, which TinyFish API produced it |
| **Ghost citation** | Reference that matches no real paper |
| **Verdict** | Per-check result (e.g. `found`, `contradicted`, `retracted`) |
| **Status** | Roll-up per citation (`verified`, `not_found`, `not_supported`, `retracted`, …) |
| **Trust score** | `round(100 × (verified + 0.5 × partially_verified) / checked)` |
| **Grounded Answer** | Q&A where the LLM may only use pages TinyFish fetched in this request |
| **Shared cache** | Verify a paper once, reuse for everyone (`reference_cache`) |

## Tone of the product

Precise, calm, evidentiary. We don't say "AI thinks this is fake". We say "No matching paper in live scholarly search" and show what we searched.
