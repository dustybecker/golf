-- The 2026 Ultimate Sports Decathlon — foundational schema.
--
-- Additive: sits alongside the existing pool_id-keyed tables (golfers,
-- draft_picks, draft_entrants, draft_state, tournament_meta,
-- tournament_round_scores). Existing flows keep working; new code bridges the
-- old world via events.legacy_pool_id.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Seasons & members
-- ---------------------------------------------------------------------------

create table if not exists public.seasons (
  season_id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  label text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fixed roster of participants for the year. entrant_id points at the
-- canonical draft_entrants row for this person (for 2026, the Masters pool
-- members are canonical).
create table if not exists public.season_members (
  season_id uuid not null references public.seasons(season_id) on delete cascade,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  display_name text not null,
  seat_order integer,
  created_at timestamptz not null default now(),
  primary key (season_id, entrant_id)
);

create index if not exists season_members_entrant_idx
  on public.season_members (entrant_id);

-- person_key lets us resolve the same real person across different
-- pool_id-scoped draft_entrants rows (e.g. Masters pool entrant vs. US Open
-- pool entrant are the same person).
alter table public.draft_entrants
  add column if not exists person_key text;

create index if not exists draft_entrants_person_key_idx
  on public.draft_entrants (person_key);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(season_id) on delete cascade,
  slug text not null,
  name text not null,
  event_type text not null,
  tier smallint not null check (tier in (1, 2, 3)),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'open-entry', 'locked', 'live', 'final', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  lock_at timestamptz,
  legacy_pool_id text,
  group_key text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug)
);

create index if not exists events_season_status_idx
  on public.events (season_id, status);

create index if not exists events_starts_at_idx
  on public.events (starts_at);

create index if not exists events_legacy_pool_idx
  on public.events (legacy_pool_id);

-- ---------------------------------------------------------------------------
-- Entries (user-submitted picks for non-draft events, plus a record-keeping
-- row for draft events so finalize code has a single surface to read from).
-- ---------------------------------------------------------------------------

create table if not exists public.event_entries (
  entry_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(event_id) on delete cascade,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  submitted_at timestamptz,
  locked_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, entrant_id)
);

create index if not exists event_entries_event_idx
  on public.event_entries (event_id);

-- ---------------------------------------------------------------------------
-- Finishes (materialized 1st-6th ranking + points, written at finalize)
-- ---------------------------------------------------------------------------

create table if not exists public.event_finishes (
  event_id uuid not null references public.events(event_id) on delete cascade,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  finish_rank numeric(4, 2) not null,
  raw_score numeric,
  base_points numeric not null,
  awarded_points numeric not null,
  tie_break_notes text,
  computed_at timestamptz not null default now(),
  primary key (event_id, entrant_id)
);

create index if not exists event_finishes_entrant_idx
  on public.event_finishes (entrant_id);

-- ---------------------------------------------------------------------------
-- Bonus awards (bypass tier multipliers)
-- ---------------------------------------------------------------------------

create table if not exists public.bonus_awards (
  bonus_id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(season_id) on delete cascade,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  event_id uuid references public.events(event_id) on delete set null,
  bonus_type text not null
    check (bonus_type in (
      'hot_seat', 'survivor', 'golden_ticket', 'nine_darter',
      'perfect_week', 'oracle', 'derby_longshot', 'wm_mark'
    )),
  points numeric not null,
  note text,
  awarded_at timestamptz not null default now()
);

create index if not exists bonus_awards_season_entrant_idx
  on public.bonus_awards (season_id, entrant_id);

create index if not exists bonus_awards_event_idx
  on public.bonus_awards (event_id);

-- ---------------------------------------------------------------------------
-- Hot Seat
-- ---------------------------------------------------------------------------

create table if not exists public.hot_seat_weeks (
  hot_seat_id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(season_id) on delete cascade,
  week_start date not null,
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  declaration_text text,
  bet_details text,
  odds_american integer,
  declared_at timestamptz,
  veto_deadline timestamptz,
  status text not null default 'awaiting'
    check (status in ('awaiting', 'pending', 'approved', 'vetoed', 'hit', 'miss')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (season_id, week_start)
);

create index if not exists hot_seat_weeks_entrant_idx
  on public.hot_seat_weeks (entrant_id);

create table if not exists public.hot_seat_vetos (
  hot_seat_id uuid not null references public.hot_seat_weeks(hot_seat_id) on delete cascade,
  voter_entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  vote text not null check (vote in ('veto', 'approve')),
  created_at timestamptz not null default now(),
  primary key (hot_seat_id, voter_entrant_id)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  entrant_id uuid primary key references public.draft_entrants(entrant_id) on delete cascade,
  email text,
  phone_e164 text,
  push_subscription jsonb,
  prefs jsonb not null default '{
    "draft_opens": true,
    "draft_turn": true,
    "turn_timer_warn": true,
    "event_lock": true,
    "event_final": true,
    "hot_seat_declared": true,
    "hot_seat_veto": true,
    "season_digest": true
  }'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_log (
  notif_id uuid primary key default gen_random_uuid(),
  entrant_id uuid not null references public.draft_entrants(entrant_id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'push')),
  kind text not null,
  subject text,
  payload jsonb,
  sent_at timestamptz not null default now(),
  provider_msg_id text,
  error text
);

create index if not exists notification_log_entrant_idx
  on public.notification_log (entrant_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Scoring rules reference table
-- ---------------------------------------------------------------------------

create table if not exists public.scoring_rules (
  scope text not null,
  key text not null,
  value numeric not null,
  primary key (scope, key)
);

insert into public.scoring_rules (scope, key, value) values
  ('finish_points', '1', 10),
  ('finish_points', '2', 7),
  ('finish_points', '3', 5),
  ('finish_points', '4', 3),
  ('finish_points', '5', 1),
  ('finish_points', '6', 0),
  ('tier_multiplier', '1', 1),
  ('tier_multiplier', '2', 2.5),
  ('tier_multiplier', '3', 5)
on conflict (scope, key) do update set value = excluded.value;
