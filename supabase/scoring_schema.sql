create table if not exists public.tournament_meta (
  pool_id text not null,
  tournament_slug text not null,
  round_count integer not null default 4 check (round_count between 1 and 4),
  round_par numeric not null default 72,
  primary key (pool_id, tournament_slug)
);

create table if not exists public.tournament_round_scores (
  pool_id text not null,
  tournament_slug text not null,
  golfer text not null,
  round_number integer not null check (round_number between 1 and 4),
  strokes numeric,
  score_status text not null default 'played'
    check (score_status in ('played', 'cut', 'wd', 'dq', 'dns')),
  position integer,
  position_text text,
  primary key (pool_id, tournament_slug, golfer, round_number)
);

create index if not exists tournament_round_scores_lookup_idx
  on public.tournament_round_scores (pool_id, tournament_slug, round_number, golfer);

insert into public.tournament_meta (pool_id, tournament_slug, round_count, round_par)
values
  ('2026-majors-masters', 'masters', 4, 72),
  ('2026-majors-pga-championship', 'pga-championship', 4, 72),
  ('2026-majors-us-open', 'us-open', 4, 72),
  ('2026-majors-the-open', 'the-open', 4, 72)
on conflict (pool_id, tournament_slug) do nothing;
