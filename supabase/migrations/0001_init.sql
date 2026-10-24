create extension if not exists vector;
create extension if not exists pgcrypto;

-- enums
create type input_type as enum ('text','pdf','bib','url');
create type run_status as enum ('queued','parsing','checking','completed','failed');
create type citation_status as enum ('pending','checking','verified','partially_verified','needs_review','not_found','not_supported','retracted','error');
create type existence_verdict as enum ('pending','found','metadata_mismatch','not_found','error');
create type support_verdict as enum ('pending','supported','partially_supported','unsupported','contradicted','unverifiable','not_applicable','error');
create type integrity_verdict as enum ('pending','clean','corrected','concern','retracted','unknown','error');
create type currency_verdict as enum ('pending','current','outdated','disputed','no_recent_coverage','not_applicable','error');
create type check_type as enum ('identifier','existence','support','integrity','currency','answer');
create type tf_api as enum ('search','fetch','agent','none');

-- helper: Clerk user id from JWT
create or replace function public.requesting_user_id() returns text
language sql stable as $$ select nullif(auth.jwt()->>'sub','')::text $$;

-- users (Clerk ids are text like "user_2abc...")
create table public.users (
  id          text primary key,
  email       text,
  name        text,
  created_at  timestamptz not null default now()
);

create table public.runs (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references public.users(id) on delete cascade,
  title               text not null default 'Untitled',
  input_type          input_type not null,
  source_storage_path text,                -- uploads/{owner}/{run}/{file}
  source_text         text,                -- pasted text (<= 60k chars)
  source_url          text,
  status              run_status not null default 'queued',
  stage_detail        text,                -- e.g. "Parsed 38 references"
  options             jsonb not null default '{"checks":["existence","support","integrity"],"recency_minutes":10080}',
  total_citations     int not null default 0,
  checked_citations   int not null default 0,
  counts              jsonb not null default '{}',   -- {verified:33, not_found:1, ...}
  trust_score         int,
  tinyfish_usage      jsonb not null default '{"search":0,"fetch":0,"agent":0,"cache_hits":0}',
  share_id            text unique,
  is_sample           boolean not null default false,
  error               text,
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz
);
create index on public.runs (owner_id, created_at desc);

create table public.citations (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.runs(id) on delete cascade,
  idx             int not null,
  bib_key         text,
  raw             text not null,
  parsed          jsonb not null,          -- ParsedRef
  status          citation_status not null default 'pending',
  existence       existence_verdict not null default 'pending',
  support         support_verdict not null default 'pending',
  integrity       integrity_verdict not null default 'pending',
  reason          text,                     -- one-line human summary shown in the list
  matched         jsonb,                    -- canonical metadata
  field_diffs     jsonb,                    -- [{field, cited, actual}]
  cache_key       text,
  fix             jsonb,                    -- {type:'canonical'|'claim'|'remove', payload, applied_at}
  updated_at      timestamptz not null default now(),
  unique (run_id, idx)
);
create index on public.citations (run_id, idx);

create table public.claims (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.runs(id) on delete cascade,
  citation_id      uuid references public.citations(id) on delete cascade,  -- null for uncited time-sensitive claims
  text             text not null,
  context          text,
  is_time_sensitive boolean not null default false,
  support          support_verdict not null default 'pending',
  currency         currency_verdict not null default 'not_applicable',
  suggested_fix    jsonb,                   -- {find, replace}
  created_at       timestamptz not null default now()
);
create index on public.claims (run_id);
create index on public.claims (citation_id);

create table public.evidence (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.runs(id) on delete cascade,
  citation_id   uuid references public.citations(id) on delete cascade,
  claim_id      uuid references public.claims(id) on delete cascade,
  check_type    check_type not null,
  verdict       text not null,              -- the verdict this evidence backs (enum value as text)
  api           tf_api not null default 'none',
  source_url    text,
  source_title  text,
  publisher     text,
  published_at  timestamptz,
  quote         text,
  explanation   text,
  confidence    real,
  raw           jsonb,                      -- truncated raw TinyFish/LLM payload (<= 20KB)
  created_at    timestamptz not null default now()
);
create index on public.evidence (citation_id);
create index on public.evidence (run_id);

create table public.answers (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references public.users(id) on delete cascade,
  question     text not null,
  answer_md    text,
  sentences    jsonb,                       -- [{text, cites:[{n, quote}]}]
  sources      jsonb,                       -- [{n, url, title, publisher, published_at, fetched_at, api}]
  tinyfish_usage jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index on public.answers (owner_id, created_at desc);

-- shared, cross-user cache (no PII)
create table public.reference_cache (
  key            text primary key,          -- 'doi:10.x/..' | 'arxiv:1706.03762' | 'title:<sha1>'
  canonical      jsonb not null,            -- {title, authors, year, venue, doi, url, pdf_url, cited_by_count}
  fulltext_url   text,
  integrity      integrity_verdict,
  integrity_evidence jsonb,
  title_embedding vector(768),              -- P1 semantic cache
  etag           text,
  fetched_at     timestamptz not null default now(),
  integrity_checked_at timestamptz
);

create table public.api_usage (
  id          bigint generated always as identity primary key,
  run_id      uuid references public.runs(id) on delete set null,
  answer_id   uuid references public.answers(id) on delete set null,
  provider    text not null,                -- 'tinyfish' | 'gemini'
  api         text not null,                -- 'search' | 'fetch' | 'agent' | 'flash' | 'pro'
  units       int not null default 1,
  cache_hit   boolean not null default false,
  latency_ms  int,
  ok          boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.api_usage (run_id);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger citations_touch before update on public.citations
for each row execute function public.touch_updated_at();
