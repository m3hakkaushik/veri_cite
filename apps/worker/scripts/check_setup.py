"""Secret-safe configuration check and optional hosted M1 verification."""

import argparse
import asyncio
import os
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[3]
WEB_ENV = ROOT / "apps/web/.env.local"
WORKER_ENV = ROOT / "apps/worker/.env"
WEB_REQUIRED = (
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "WORKER_SHARED_SECRET",
)
WORKER_REQUIRED = (
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WORKER_SHARED_SECRET",
    "GOOGLE_API_KEY",
    "TINYFISH_API_KEY",
)


def settings_from(path: Path) -> dict[str, str]:
    return {
        key: os.environ.get(key, value or "").strip() for key, value in dotenv_values(path).items()
    }


def present(values: dict[str, str], name: str) -> bool:
    return bool(os.environ.get(name, values.get(name, "")).strip())


async def check_database(dsn: str) -> int:
    # Development-only dependency: absent from the production worker's request path.
    import psycopg

    try:
        async with await psycopg.AsyncConnection.connect(
            dsn,
            sslmode="require",
            connect_timeout=10,
            autocommit=True,
            options="-c statement_timeout=30000 -c lock_timeout=5000",
        ) as connection:
            try:
                for filename in ("readiness.sql", "rls.sql"):
                    sql = (ROOT / "supabase/tests" / filename).read_text()
                    await connection.execute(sql, prepare=False)
                    print(f"PASS hosted {filename}")
            finally:
                # The RLS script rolls back itself. Also guarantee rollback if it fails midway.
                await connection.execute("rollback")
    except Exception as error:
        # Driver messages can include connection details; print only a class and SQLSTATE.
        state = getattr(error, "sqlstate", None)
        detail = f", SQLSTATE {state}" if state else ""
        print(f"Hosted verification failed ({type(error).__name__}{detail}).")
        print("Check the connection, applied migrations, and admin permissions locally.")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database", action="store_true", help="Run hosted readiness/RLS SQL tests"
    )
    args = parser.parse_args()
    web = settings_from(WEB_ENV)
    worker = settings_from(WORKER_ENV)
    missing = False
    for label, values, required in (
        ("Web", web, WEB_REQUIRED),
        ("Worker", worker, WORKER_REQUIRED),
    ):
        absent = [name for name in required if not present(values, name)]
        missing |= bool(absent)
        print(
            f"{label}: missing {', '.join(absent)}"
            if absent
            else f"{label}: required settings present"
        )
    print(f"TinyFish key: {'present' if present(worker, 'TINYFISH_API_KEY') else 'missing'}")
    print("Presence check only. Secret values are never printed.")
    if args.database:
        dsn = os.getenv("SUPABASE_DB_URL", worker.get("SUPABASE_DB_URL", ""))
        if not dsn:
            print("Hosted check needs SUPABASE_DB_URL in the ignored worker .env.")
            return 2
        return asyncio.run(check_database(dsn))
    return 2 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
