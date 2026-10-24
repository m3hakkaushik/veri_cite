alter table public.users enable row level security;
alter table public.runs enable row level security;
alter table public.citations enable row level security;
alter table public.claims enable row level security;
alter table public.evidence enable row level security;
alter table public.answers enable row level security;
alter table public.reference_cache enable row level security;
alter table public.api_usage enable row level security;

-- users: read/update self
create policy users_self_select on public.users for select to authenticated using (id = requesting_user_id());
create policy users_self_upsert on public.users for insert to authenticated with check (id = requesting_user_id());

-- runs: owner can read; sample runs readable by any signed-in user
create policy runs_owner_select on public.runs for select to authenticated
  using (owner_id = requesting_user_id() or is_sample);

-- child tables: readable if parent run is readable
create policy citations_select on public.citations for select to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and (r.owner_id = requesting_user_id() or r.is_sample)));
create policy claims_select on public.claims for select to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and (r.owner_id = requesting_user_id() or r.is_sample)));
create policy evidence_select on public.evidence for select to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and (r.owner_id = requesting_user_id() or r.is_sample)));

create policy answers_owner_select on public.answers for select to authenticated using (owner_id = requesting_user_id());

-- reference_cache, api_usage: no client access (service role only). No policies = denied.
