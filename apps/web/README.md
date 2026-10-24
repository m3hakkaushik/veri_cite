# VeriCite web

Next.js App Router + strict TypeScript + Tailwind CSS v4 + shadcn/ui.

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm test:contracts
```

Run these from the repository root after configuring the ignored web/worker
local environments. Keep the existing Clerk application; do not run `init`.
Only `NEXT_PUBLIC_` settings may reach the browser. Database service credentials
and worker signing secrets stay in server-only modules.

The landing page at <http://localhost:3000> leads to `/app/new`, which supports PDF/BibTeX/text input, review,
signed uploads and live job creation. `/app/runs/[id]` reads stored results and
updates via Realtime with a polling fallback. History is available from the
sidebar. Current verification coverage is existence only; support, integrity,
exports and Grounded Answer are not presented as working features.

Brand tokens live in `app/globals.css`. Fonts are served via `next/font/google`.
See [setup](../../docs/18-env-deployment.md) and [progress](../../docs/CHANGELOG.md)
for verified scope and the remaining authenticated/deployment checks.
