# Hosted Supabase setup

The application uses hosted Supabase. No Docker or local Supabase services run.

Apply the SQL files in `migrations/` in numeric order using the hosted SQL
editor, or an authenticated linked CLI's `supabase db push`. The first three
migrations exactly mirror doc 09. Migration 0004 adds the atomic progress RPC
with execution restricted to `service_role`.

Run `tests/readiness.sql` and `tests/rls.sql` in the hosted SQL editor afterward.
The RLS test inserts synthetic data inside a transaction, switches between
synthetic JWT subjects and anonymous/backend roles, asserts isolation, and
rolls back all fixtures.

For offline verification from the repository root:

```sh
pnpm test:db
```

This uses PGlite's in-memory PostgreSQL engine and pgvector/pgcrypto extensions.
It applies the actual migration SQL and exercises RLS with real PostgreSQL
roles. The harness supplies Supabase-compatible `auth.jwt()`, bucket, and
publication scaffolding; it is a test fixture, not a local Supabase deployment.
It checks enum/document parity and verifies its fixtures are rolled back.

These tests do **not** validate your hosted project, Clerk JWT signature
verification, signed-upload transport, or Realtime event delivery. Run the
hosted checks after configuring the project, then record their results in
`docs/CHANGELOG.md`. Never seed a sample verdict without an actual verified run.
