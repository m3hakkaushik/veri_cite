# 18 — Local environment and deployment

## Hosting decision — 24 October 2026

Use **hosted Supabase** for Postgres, private file storage, and Realtime.
Use **Gemini direct PDF input** for reference/claim extraction. The worker runs
as native Python. No Docker, Compose, GROBID, or local Supabase stack is required.

Supabase stores PDFs and verification records; it does not parse academic PDFs.
PDF bytes are read by the worker and passed through the Gemini wrapper.

The tested fast model is now `gemini-3.8-flash`; the original 2.5 Flash returned
HTTP 404 for this project. Google's [availability notice](https://ai.google.dev/gemini-api/docs/deprecations/)
restricts 2.5 to existing active users. The configurable escalation target is
`gemini-3.1-pro-preview`, from the [current model catalog](https://ai.google.dev/gemini-api/docs/models).
Both model roles still pass through the same Gemini wrapper and usage log.

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

The frontend requires the existing Clerk application's development keys; the
worker health endpoint can run with blank provider keys.
Keep provider keys in the ignored local environment files, never in chat or Git.

| File | Required values |
|------|-----------------|
| `apps/web/.env.local` | Clerk publishable/secret keys; Supabase URL/anon/service-role keys; worker URL and shared secret |
| `apps/worker/.env` | Supabase URL/service-role key; TinyFish API key; Google AI Studio key; same worker shared secret |

Service-role keys must never have a `NEXT_PUBLIC_` prefix. Use a long random
shared secret, identical in the web and worker environments. A Supabase browser
client must use a Clerk session token with the third-party auth integration,
not a service-role key or the deprecated Supabase JWT template.

For this repository, Clerk is linked to the user's existing application. The
installed Core 3 SDK and skills are preserved. To restore its development keys,
authenticate the CLI on the host if needed, then run `pnpm dlx clerk@latest env
pull --instance dev --file .env.local` from `apps/web`. Do not run `init`, replace
working keys, or create another application. `pnpm dlx clerk@latest doctor`
verifies the link and key presence without printing secrets. The user completes
their own first sign-up; no account is created automatically in this existing app.

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` setting also accepts Supabase's modern
publishable key. The server-only `SUPABASE_SERVICE_ROLE_KEY` setting accepts
the modern secret key. The URL is the project root `https://…supabase.co`,
without `/rest/v1/`. A legacy service JWT is not required alongside a secret key.

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
pnpm test:db
pnpm lint:worker
cd apps/worker
uv run ruff format --check .
uv run pytest -q
uv run python scripts/smoke_tinyfish.py
uv run python scripts/smoke_gemini.py
```

Hosted database/RLS checks and live TinyFish/Gemini smoke checks require real
configuration. Mark them pending until executed; never substitute simulated
results for live verification.

Use `pnpm check:setup` to list missing setting names without printing values.
Exit code 2 means configuration is incomplete; a successful presence check is
not a live service/authentication test.

After applying the migrations, optionally set `SUPABASE_DB_URL` in the ignored
worker `.env` to the hosted admin/session-pooler connection string and run
`pnpm check:hosted`. This executes the readiness and transaction-scoped RLS SQL
against that hosted database using TLS, then rolls back fixture data. It does
not apply migrations. The connection string is never printed. The runtime
worker does not require this admin connection or its development-only driver.

On IPv4-only networks, choose **Connect → Method → Session pooler** in the
Supabase dashboard. The direct `db.…supabase.co` endpoint may only resolve to
IPv6. Copy the actual pooler hostname and `postgres.PROJECTREF` username from
that dialog; do not infer the pooler cluster number from the region. Keep the
password and resulting DSN in the ignored worker environment.

`pnpm test:db` uses an in-memory PostgreSQL engine with test-only Supabase
interfaces, actual migrations, and actual RLS execution. It needs no Docker,
network service, or credentials. See [the database setup guide](../supabase/README.md)
for the checks it covers and the hosted transport/auth checks it cannot cover.

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
