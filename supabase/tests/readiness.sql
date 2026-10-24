-- Read-only assertions. Run as postgres in the hosted SQL editor after migrations.
do $$
declare table_name text; enum_count integer;
begin
  foreach table_name in array array[
    'users','runs','citations','claims','evidence','answers','reference_cache','api_usage'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity
    ) then raise exception 'Missing table or RLS: %', table_name; end if;
  end loop;
  select count(*) into enum_count from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e' and t.typname in (
    'input_type','run_status','citation_status','existence_verdict','support_verdict',
    'integrity_verdict','currency_verdict','check_type','tf_api'
  );
  if enum_count <> 9 then raise exception 'Missing contract enums'; end if;
  if not exists (select 1 from storage.buckets where id = 'uploads' and not public) then
    raise exception 'Private uploads bucket missing';
  end if;
  foreach table_name in array array['runs','citations','evidence'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = table_name
    ) then raise exception 'Realtime table missing: %', table_name; end if;
  end loop;
  if has_function_privilege('anon','public.increment_checked(uuid)','execute')
     or has_function_privilege('authenticated','public.increment_checked(uuid)','execute')
     or not has_function_privilege('service_role','public.increment_checked(uuid)','execute') then
    raise exception 'Worker RPC permissions are incorrect';
  end if;
end $$;
