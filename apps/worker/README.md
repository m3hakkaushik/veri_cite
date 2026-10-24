# VeriCite worker

Python 3.12, managed with uv. Run from this directory:

```sh
uv sync --frozen
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check .
uv run ruff format --check .
```

`GET /health` reports worker liveness, the Gemini PDF parser selection, and version without
requiring provider keys. Copy `.env.example` to `.env` for later integrations.

M0 establishes the package layout and health endpoint. Other modules are
intentionally empty until their SOP milestones pass. No verification, LLM,
Agent, or database calls are implemented or simulated.

M1 adds `app/db.py` with a lazy, asynchronous service-role client factory.
It loads this worker's ignored `.env`, disables Supabase-managed session
persistence/refresh, and requires the hosted HTTPS project URL. It does not
perform calls until used by a worker service. The application still performs
no live verification.

All future TinyFish calls must go through `app/clients/tinyfish.py`, and all
Gemini calls through `app/clients/llm.py`. See `../../docs/07-tinyfish-integration.md`
for the inspected SDK signatures and `../../docs/CHANGELOG.md` for progress.
