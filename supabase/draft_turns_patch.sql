alter table public.draft_entrants
  add column if not exists auto_draft_enabled boolean not null default false;

create table if not exists public.draft_state (
  pool_id text primary key,
  draft_started boolean not null default false,
  current_pick integer not null default 1,
  current_round integer not null default 1,
  current_entrant_id uuid references public.draft_entrants(entrant_id) on delete set null,
  turn_started_at timestamptz,
  turn_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists draft_state_current_entrant_idx
  on public.draft_state (current_entrant_id);

alter table public.draft_state
  add column if not exists turn_started_at timestamptz;

alter table public.draft_state
  add column if not exists turn_expires_at timestamptz;
