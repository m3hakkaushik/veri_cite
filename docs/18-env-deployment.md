# 18 — Local environment and deployment

## Hosting decision — 24 October 2026

Use **hosted Supabase** for Postgres, private file storage, and Realtime.
Use **Gemini direct PDF input** for reference/claim extraction. The worker runs
as native Python. No Docker, Compose, GROBID, or local Supabase stack is required.

Supabase stores PDFs and verification records; it does not parse academic PDFs.
PDF bytes are read by the worker and passed through the Gemini wrapper.

## Local prerequisites

- Node.js 20.9+ and pnpm 11.22.0.
- `uv`, which downloads the project's Python 3.12 runtime automatically.

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
cd apps/worker
uv sync --frozen
```

The public frontend and worker health endpoint run with blank provider keys.
Keep provider keys in the ignored local environment files, never in chat or Git.

| File | Required values |
|------|-----------------|
| `apps/web/.env.local` | Clerk publishable/secret keys; Supabase URL/anon/service-role keys; worker URL and shared secret |
| `apps/worker/.env` | Supabase URL/service-role key; TinyFish API key; Google AI Studio key; same worker shared secret |

Service-role keys must never have a `NEXT_PUBLIC_` prefix. Use a long random
shared secret, identical in the web and worker environments. A Supabase browser
client must use a Clerk session token with the third-party auth integration,
not a service-role key or the deprecated Supabase JWT template.

## Hosted Supabase setup (M1)

1. Select/create the hosted project (Mumbai `ap-south-1` is the planned region).
2. Apply `supabase/migrations/0001_init.sql` through `0004_worker_rpcs.sql` in
   filename order using the hosted SQL editor. A linked/authenticated Supabase
   CLI can instead run `supabase db push`; local containers are unnecessary.
3. In Clerk, enable Google/email and the Supabase integration. In Supabase,
   register the Clerk domain as a third-party auth provider. Follow the
   [official integration guide](https://supabase.com/docs/guides/auth/third-party/clerk).
4. Run `supabase/tests/rls.sql` in the hosted SQL editor. It uses an isolated
   transaction with synthetic identities and rolls back all fixture data.
5. Run `supabase/tests/readiness.sql` to assert tables, enums, RLS, private
   uploads, Realtime publication, and restricted worker RPC permissions.
6. Record actual results in the changelog. Prepared SQL is not an applied schema.

## Development

In separate terminals at the repository root:

```sh
pnpm dev          # http://localhost:3000
pnpm dev:worker   # http://localhost:8000/health
```

Expected worker response:
`{"ok":true,"pdf_parser":"gemini","version":"0.1.0"}`.
This checks process liveness and parser selection, not credentials or external
provider availability. It makes no paid API calls.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
pnpm lint:worker
cd apps/worker
uv run ruff format --check .
```

Hosted database/RLS checks and live TinyFish/Gemini smoke checks require real
configuration. Mark them pending until executed; never substitute simulated
results for live verification.

## Deployment targets (M10)

- Vercel: root directory `apps/web`; configure web environment variables.
- Railway or another always-on Python host: native build `uv sync --frozen`
  from `apps/worker`; start with `uv run uvicorn app.main:app --host 0.0.0.0
  --port $PORT`. Keep one instance running for background jobs.
- Hosted Supabase: applied schema, Clerk integration, private uploads, Realtime.
- Gemini: direct PDF/text extraction and source-bound judgments via the worker.

A complete production demo still needs real results and evaluation. The
three-minute presentation is in [judges.md](judges.md). The detailed production
rehearsal and evaluation docs (`15-demo-and-pitch.md`, `16-testing-evaluation.md`)
remain to be written from actual pipeline behavior.
