create or replace function public.increment_checked(p_run uuid)
returns void language sql set search_path = '' as $$
  update public.runs set checked_citations = checked_citations + 1 where id = p_run;
$$;

-- Only the trusted backend may advance job progress. Explicitly restrict RPC
-- execution; default function grants include PUBLIC on PostgreSQL.
revoke all on function public.increment_checked(uuid) from public, anon, authenticated;
grant execute on function public.increment_checked(uuid) to service_role;
