-- Run after all migrations in the hosted SQL editor, or via pnpm test:db.
-- All fixtures and grants are transaction-local and rolled back.
begin;

create temporary table rls_fixture (
  owner_a text, owner_b text, run_a uuid, run_b uuid, sample_run uuid
) on commit drop;
insert into rls_fixture values (
  'user_test_' || gen_random_uuid(), 'user_test_' || gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
);
grant select on rls_fixture to authenticated, anon, service_role;

insert into public.users (id)
select owner_a from rls_fixture union all select owner_b from rls_fixture;
insert into public.runs (id, owner_id, input_type, is_sample)
select run_a, owner_a, 'text'::public.input_type, false from rls_fixture union all
select run_b, owner_b, 'text'::public.input_type, false from rls_fixture union all
select sample_run, owner_b, 'text'::public.input_type, true from rls_fixture;
insert into public.citations (run_id, idx, raw, parsed)
select id, 1, 'RLS test fixture', '{}'::jsonb from public.runs
where id in (select run_a from rls_fixture union all select run_b from rls_fixture
             union all select sample_run from rls_fixture);
insert into public.claims (run_id, citation_id, text)
select run_id, id, 'RLS test claim' from public.citations
where run_id in (select run_a from rls_fixture union all select run_b from rls_fixture
                 union all select sample_run from rls_fixture);
insert into public.evidence (run_id, citation_id, check_type, verdict, source_url)
select run_id, id, 'existence', 'pending', 'https://example.org/rls-test-fixture'
from public.citations
where run_id in (select run_a from rls_fixture union all select run_b from rls_fixture
                 union all select sample_run from rls_fixture);
insert into public.answers (owner_id, question)
select owner_a, 'RLS fixture A' from rls_fixture union all
select owner_b, 'RLS fixture B' from rls_fixture;
insert into public.reference_cache (key, canonical)
select 'rls-test:' || run_a, '{}'::jsonb from rls_fixture;
insert into public.api_usage (run_id, provider, api)
select run_a, 'tinyfish', 'search' from rls_fixture;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select owner_a from rls_fixture), 'role', 'authenticated'
)::text, true);

do $$
declare f record; n integer; table_name text;
begin
  select * into f from rls_fixture;
  if (select count(*) from public.users where id = f.owner_a) <> 1
     or exists (select 1 from public.users where id = f.owner_b) then
    raise exception 'FAIL: user identity isolation';
  end if;
  if (select count(*) from public.runs where id = f.run_a) <> 1 then
    raise exception 'FAIL: owner cannot read own run';
  end if;
  if exists (select 1 from public.runs where id = f.run_b) then
    raise exception 'FAIL: cross-user run leaked';
  end if;
  if (select count(*) from public.runs where id = f.sample_run) <> 1 then
    raise exception 'FAIL: signed-in sample access';
  end if;
  foreach table_name in array array['citations','claims','evidence'] loop
    execute format('select count(*) from public.%I where run_id = $1', table_name)
      into n using f.run_b;
    if n <> 0 then raise exception 'FAIL: cross-user % leaked', table_name; end if;
    execute format('select count(*) from public.%I where run_id = $1', table_name)
      into n using f.run_a;
    if n <> 1 then raise exception 'FAIL: own % unreadable', table_name; end if;
    execute format('select count(*) from public.%I where run_id = $1', table_name)
      into n using f.sample_run;
    if n <> 1 then raise exception 'FAIL: sample % unreadable', table_name; end if;
  end loop;
  if exists (select 1 from public.answers where owner_id = f.owner_b)
     or (select count(*) from public.answers where owner_id = f.owner_a) <> 1 then
    raise exception 'FAIL: answer ownership isolation';
  end if;
  foreach table_name in array array['reference_cache','api_usage'] loop
    begin
      execute format('select count(*) from public.%I', table_name) into n;
      if n <> 0 then raise exception 'FAIL: backend-only % leaked', table_name; end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    insert into public.runs (owner_id, input_type) values (f.owner_a, 'text');
    raise exception 'FAIL: browser inserted a run directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.runs set title = 'forbidden browser write' where id = f.run_a;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: browser updated a run directly'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.increment_checked(f.run_a);
    raise exception 'FAIL: browser executed worker RPC';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Check the opposite direction too; a one-sided ownership bug must not pass.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select owner_b from rls_fixture), 'role', 'authenticated'
)::text, true);
do $$
begin
  if exists (select 1 from public.runs where id = (select run_a from rls_fixture))
     or (select count(*) from public.runs where id = (select run_b from rls_fixture)) <> 1 then
    raise exception 'FAIL: reverse ownership isolation';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    if exists (select 1 from public.runs where id in (
      select run_a from rls_fixture union all select run_b from rls_fixture
      union all select sample_run from rls_fixture
    )) then raise exception 'FAIL: anonymous run access'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
-- Exercise the atomic RPC with the backend role, then verify exactly two increments.
set local role service_role;
select public.increment_checked(run_a) from rls_fixture;
select public.increment_checked(run_a) from rls_fixture;
reset role;
do $$
begin
  if (select checked_citations from public.runs where id = (select run_a from rls_fixture)) <> 2 then
    raise exception 'FAIL: worker increment is not atomic/additive';
  end if;
end $$;

rollback;
