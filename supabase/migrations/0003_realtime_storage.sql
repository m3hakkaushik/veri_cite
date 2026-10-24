-- Realtime: broadcast row changes for live report
alter publication supabase_realtime add table public.runs, public.citations, public.evidence;

-- Storage bucket (private)
insert into storage.buckets (id, name, public) values ('uploads','uploads', false)
on conflict (id) do nothing;
-- Uploads use signed upload URLs created server-side; no client storage policies needed.
