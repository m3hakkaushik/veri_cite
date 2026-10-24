# 10 — API Spec

Two layers:
1. **BFF** — Next.js route handlers at `/api/v1/*` on Vercel. Public API for web and Flutter. Auth: Clerk session (cookie on web, `Authorization: Bearer <clerk_session_jwt>` on mobile).
2. **Worker** — FastAPI at `WORKER_URL/internal/*`. Called only by the BFF. Auth: HMAC.

All JSON is `camelCase` at the BFF boundary and `snake_case` inside the worker/DB. The BFF maps between them (one `toApi()` mapper per entity).

## Shared types (TypeScript, `apps/web/lib/contracts.ts`)

```ts
export type InputType = "text" | "pdf" | "bib" | "url";
export type RunStatus = "queued" | "parsing" | "checking" | "completed" | "failed";
export type CitationStatus = "pending" | "checking" | "verified" | "partially_verified" | "needs_review" | "not_found" | "not_supported" | "retracted" | "error";
export type CheckName = "existence" | "support" | "integrity" | "currency";

export interface RunOptions { checks: CheckName[]; recencyMinutes?: number }

export interface Run {
  id: string; title: string; inputType: InputType; status: RunStatus; stageDetail?: string;
  totalCitations: number; checkedCitations: number;
  counts: Partial<Record<CitationStatus, number>>; trustScore: number | null;
  tinyfishUsage: { search: number; fetch: number; agent: number; cacheHits: number };
  shareId?: string | null; createdAt: string; completedAt?: string | null; error?: string | null;
}

export interface Citation {
  id: string; idx: number; bibKey?: string; raw: string;
  parsed: { title?: string; authors: string[]; year?: number; venue?: string; doi?: string; arxivId?: string; url?: string };
  status: CitationStatus;
  existence: string; support: string; integrity: string;
  reason?: string;
  matched?: { title: string; authors: string[]; year?: number; venue?: string; doi?: string; url?: string; pdfUrl?: string; citedByCount?: number } | null;
  fieldDiffs?: { field: string; cited: string | null; actual: string | null }[];
  fix?: { type: "canonical" | "claim" | "remove"; payload?: unknown; appliedAt: string } | null;
  claims?: Claim[]; evidence?: Evidence[];
}

export interface Claim { id: string; text: string; context?: string; support: string; currency: string; suggestedFix?: { find: string; replace: string } | null }

export interface Evidence {
  id: string; checkType: "identifier" | "existence" | "support" | "integrity" | "currency" | "answer";
  verdict: string; api: "search" | "fetch" | "agent" | "none";
  sourceUrl?: string; sourceTitle?: string; publisher?: string; publishedAt?: string;
  quote?: string; explanation?: string; confidence?: number;
}
```

Error shape (all non-2xx): `{ "error": { "code": "string", "message": "human readable" } }`.

## BFF endpoints

| Method | Path | Auth | Body / Query | Response | Notes |
|--------|------|------|--------------|----------|-------|
| POST | `/api/v1/uploads/sign` | user | `{ filename, contentType, size }` | `{ uploadUrl, token, storagePath }` | Validates type (`application/pdf`, `.bib` as `text/x-bibtex`/`text/plain`) and size (PDF ≤ 20 MB, bib ≤ 2 MB). Uses `storage.from('uploads').createSignedUploadUrl(path)` |
| POST | `/api/v1/runs` | user | `{ inputType, title?, text?, storagePath?, url?, options? }` | `201 { run: Run }` | Upserts user, inserts run (service role), calls worker `/internal/runs/{id}/start`. If worker call fails → run `failed` with error |
| POST | `/api/v1/runs/sample` | user | — | `201 { run }` | Clones the sample input into a new live run for the user (real TinyFish calls) |
| GET | `/api/v1/runs` | user | `?limit=20&cursor=` | `{ runs: Run[], nextCursor }` | History |
| GET | `/api/v1/runs/:id` | user / sample | — | `{ run, citations: Citation[] }` (with claims + evidence) | Initial load; live updates via Realtime |
| DELETE | `/api/v1/runs/:id` | owner | — | `204` | Also deletes storage object |
| POST | `/api/v1/runs/:id/citations/:cid/fix` | owner | `{ type: "canonical"|"claim"|"remove", payload? }` | `{ citation }` | `payload` for claim = `{ claimId, find, replace }` |
| DELETE | `/api/v1/runs/:id/citations/:cid/fix` | owner | — | `{ citation }` | Undo |
| GET | `/api/v1/runs/:id/export/bib` | owner / share | — | `text/x-bibtex` attachment | Calls worker `/internal/runs/{id}/bibtex` or builds in TS from stored data (prefer worker for single implementation) |
| GET | `/api/v1/runs/:id/export/pdf` | owner / share | — | `application/pdf` | P1, `@react-pdf/renderer` |
| POST | `/api/v1/runs/:id/share` | owner | — | `{ shareId, url }` | P1; `share_id = nanoid(10)` |
| DELETE | `/api/v1/runs/:id/share` | owner | — | `204` | P1 |
| GET | `/api/v1/share/:shareId` | public | — | `{ run, citations }` | P1; strips owner info |
| POST | `/api/v1/ask` | user | `{ question }` | `text/event-stream` | Proxies the worker SSE stream (see events below) |
| GET | `/api/v1/answers` | user | — | `{ answers }` | P1 |
| GET | `/api/v1/health` | public | — | `{ ok, worker: boolean }` | Pings worker `/health` |

### Rate limits (BFF, per user, in-memory/Upstash optional)
- `POST /runs`: 10 per hour per user (sample runs included). `POST /ask`: 30 per hour. Return `429 { error: { code: "rate_limited" } }`.

## Worker endpoints (internal)

HMAC headers on every request:
```
X-VeriCite-Timestamp: <unix seconds>
X-VeriCite-Signature: hex(HMAC_SHA256(WORKER_SHARED_SECRET, `${timestamp}.${rawBody}`))
```
Reject if missing, invalid, or |now − timestamp| > 300 s.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/health` | — | `{ ok: true, pdf_parser: "gemini", version }` (no auth) |
| POST | `/internal/runs/{run_id}/start` | `{}` | `202 { accepted: true }` — schedules the pipeline; idempotent |
| POST | `/internal/runs/{run_id}/recheck/{citation_id}` | `{ checks?: [...] }` | `202` (P1) |
| GET | `/internal/runs/{run_id}/bibtex` | — | `text/plain` corrected BibTeX |
| POST | `/internal/ask` | `{ question, owner_id }` | `text/event-stream` |

### Ask SSE events (worker → BFF → client, passed through unchanged)

| event | data | When |
|-------|------|------|
| `status` | `{ "stage": "planning" \| "searching" \| "fetching" \| "composing", "detail": "Searching news: 'WHO mpox emergency'" }` | Progress |
| `sources` | `{ "sources": [{ n, url, title, publisher, publishedAt, fetchedAt, api }] }` | After fetch |
| `sentence` | `{ "text": "…", "cites": [{ "n": 1, "quote": "…" }] }` | Each validated sentence |
| `done` | `{ "answerId": "uuid", "dropped": 1, "tinyfishUsage": { search: 3, fetch: 1 } }` | End |
| `error` | `{ "code", "message" }` | Failure |

## Realtime subscription (web)

```ts
supabase.channel(`run:${runId}`)
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "runs", filter: `id=eq.${runId}` }, onRun)
  .on("postgres_changes", { event: "*", schema: "public", table: "citations", filter: `run_id=eq.${runId}` }, onCitation)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "evidence", filter: `run_id=eq.${runId}` }, onEvidence)
  .subscribe();
```
Fallback: if the channel isn't `SUBSCRIBED` within 5 s, poll `GET /api/v1/runs/:id` every 2 s until `completed|failed`.

## Mobile (Phase 2) notes
Flutter calls the same BFF with `Authorization: Bearer <Clerk session token>`. BFF route handlers must accept both cookie and bearer (Clerk `auth()` handles both when the token is passed in the header). Realtime via `supabase_flutter` with the Clerk token as `accessToken`.
