-- Golfers source table for draft pool
-- Requested columns: pool_id, rank, golfer, handicap
create table if not exists public.golfers (
  pool_id text not null,
  rank integer not null,
  golfer text not null,
  handicap numeric not null,
  primary key (pool_id, golfer)
);

create unique index if not exists golfers_pool_rank_uniq
  on public.golfers (pool_id, rank);

create index if not exists golfers_pool_name_idx
  on public.golfers (pool_id, golfer);

-- Shared draft picks table (one golfer can only be drafted once per pool)
create table if not exists public.draft_picks (
  pool_id text not null,
  entrant_name text not null,
  golfer text not null,
  pick_number integer not null check (pick_number between 1 and 6),
  primary key (pool_id, entrant_name, golfer),
  unique (pool_id, golfer),
  unique (pool_id, entrant_name, pick_number)
);

create index if not exists draft_picks_pool_entrant_idx
  on public.draft_picks (pool_id, entrant_name, pick_number);

-- Example seed rows
insert into public.golfers (pool_id, rank, golfer, handicap)
values
  ('2026-majors', 1, 'Scottie Scheffler', 2.1),
  ('2026-majors', 2, 'Rory McIlroy', 2.3),
  ('2026-majors', 3, 'Jon Rahm', 3.0),
  ('2026-majors', 4, 'Xander Schauffele', 3.4),
  ('2026-majors', 5, 'Ludvig Aberg', 4.2),
  ('2026-majors', 6, 'Collin Morikawa', 4.7),
  ('2026-majors', 7, 'Patrick Cantlay', 5.1),
  ('2026-majors', 8, 'Max Homa', 5.5),
  ('2026-majors', 9, 'Tommy Fleetwood', 6.0),
  ('2026-majors', 10, 'Jordan Spieth', 6.4)
on conflict (pool_id, golfer) do update
set
  rank = excluded.rank,
  handicap = excluded.handicap;
