// Real in-memory PostgreSQL/RLS tests, with no Docker and no hosted credentials.
// The auth/storage scaffolding below represents Supabase interfaces; this does
// not test Clerk JWT verification, hosted storage transport, or Realtime delivery.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { vector } from "@electric-sql/pglite-pgvector";

const db = new PGlite({ extensions: { vector, pgcrypto } });
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    create table storage.buckets (id text primary key, name text, public boolean default false);
    create publication supabase_realtime;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);

  const contract = await read("docs/09-data-model.md");
  const migrations = (await readdir(new URL("supabase/migrations/", root)))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of migrations) {
    const sql = await read(`supabase/migrations/${name}`);
    if (name !== "0004_worker_rpcs.sql") {
      const section = contract.split(`## Migration \`${name}\``)[1];
      const documented = section?.match(/```sql\n([\s\S]*?)\n```/)?.[1];
      assert.equal(
        sql.trim(),
        documented?.trim(),
        `${name} drifted from doc 09`,
      );
    } else {
      assert.ok(
        contract.includes(sql.trim()),
        "Worker RPC drifted from doc 09",
      );
    }
    await db.exec(sql);
    console.log(`PASS migration ${name}`);
  }

  // Match every value and its order to the enum contract, not merely enum names.
  for (const match of contract.matchAll(/^\| `([a-z_]+)` \| (.+) \|$/gm)) {
    const name = match[1];
    const expected = [...match[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const { rows } = await db.query(
      `select e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public' and t.typname = $1 order by e.enumsortorder`,
      [name],
    );
    assert.deepEqual(
      rows.map((row) => row.enumlabel),
      expected,
      `${name} values drifted`,
    );
  }
  console.log("PASS all nine enum contracts");
  await db.exec(await read("supabase/tests/readiness.sql"));
  console.log(
    "PASS schema, RLS, private bucket, publication, and RPC permissions",
  );
  await db.exec(await read("supabase/tests/rls.sql"));
  console.log(
    "PASS owner/sample/anonymous isolation, browser write denial, worker increments",
  );
  const { rows } = await db.query(
    "select count(*)::int as count from public.runs",
  );
  assert.equal(rows[0].count, 0, "RLS fixtures were not rolled back");
  console.log("PASS fixtures rolled back; no hosted connection was used");
} catch (error) {
  console.error(`Database verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
