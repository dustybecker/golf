create extension if not exists pgcrypto;

-- Entrants for a given draft pool. Each entrant gets a private access code,
-- but only the hash is stored in the database.
create table if not exists public.draft_entrants (
  entrant_id uuid primary key default gen_random_uuid(),
  pool_id text not null,
  entrant_name text not null,
  entrant_slug text not null,
  draft_position integer,
  access_code_hash text not null,
  access_code_hint text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, entrant_name),
  unique (pool_id, entrant_slug)
);

create index if not exists draft_entrants_pool_position_idx
  on public.draft_entrants (pool_id, draft_position);

-- Browser sessions. The browser receives an opaque cookie token while only a
-- hash of that token is stored server-side.
create table if not exists public.draft_sessions (
  session_id uuid primary key default gen_random_uuid(),
  pool_id text not null,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists draft_sessions_pool_entrant_idx
  on public.draft_sessions (pool_id, entrant_id);

create index if not exists draft_sessions_expires_idx
  on public.draft_sessions (expires_at);

-- Compatibility migration for the existing draft_picks table so draft writes
-- can move from entrant_name-based trust to authenticated entrant ownership.
alter table public.draft_picks
  add column if not exists entrant_id uuid;

update public.draft_picks dp
set entrant_id = de.entrant_id
from public.draft_entrants de
where dp.entrant_id is null
  and dp.pool_id = de.pool_id
  and dp.entrant_name = de.entrant_name;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'draft_picks_entrant_id_fk'
  ) then
    alter table public.draft_picks
      add constraint draft_picks_entrant_id_fk
      foreign key (entrant_id)
      references public.draft_entrants(entrant_id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists draft_picks_pool_entrant_id_pick_uniq
  on public.draft_picks (pool_id, entrant_id, pick_number)
  where entrant_id is not null;

create index if not exists draft_picks_pool_entrant_id_idx
  on public.draft_picks (pool_id, entrant_id, pick_number);

-- Example entrant seed rows. Replace the hashes with real values generated
-- server-side before using in production.
insert into public.draft_entrants (
  pool_id,
  entrant_name,
  entrant_slug,
  draft_position,
  access_code_hash,
  access_code_hint
)
values
  ('2026-majors-masters', 'Player 1', 'player-1', 1, 'replace-with-real-hash', 'P1'),
  ('2026-majors-masters', 'Player 2', 'player-2', 2, 'replace-with-real-hash', 'P2')
on conflict (pool_id, entrant_name) do nothing;
