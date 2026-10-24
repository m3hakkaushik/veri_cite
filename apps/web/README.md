# VeriCite web

Next.js App Router + strict TypeScript + Tailwind CSS v4 + shadcn/ui.

From the repository root:

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

The redesigned product preview runs at <http://localhost:3000> without credentials.
Brand tokens live in `app/globals.css`; Inter and IBM Plex Mono are loaded
through `next/font/google` and served locally by Next.js.

The public page includes a local Document/Paste text/Question workspace,
accessible review dialogs, an interactive verification-method explorer, and
mobile navigation. Input stays in memory in the current tab; the preview
performs no uploads or live verification. Refreshing clears entered drafts.

Copy `.env.example` to `.env.local` before the integrations milestone. Only
`NEXT_PUBLIC_` settings may reach the browser. Service-role and worker secrets
must stay in server-only modules.

See [environment setup](../../docs/18-env-deployment.md) and
[build progress](../../docs/CHANGELOG.md). Authentication, uploads, real reports,
and verification are not yet implemented.
