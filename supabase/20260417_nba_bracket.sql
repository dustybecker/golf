-- NBA Playoff Bracket series results. Small (~15 rows per season) lookup
-- table the bracket-nba handler reads to score entries.
create table if not exists public.nba_series_results (
  event_id uuid not null references public.events(event_id) on delete cascade,
  round text not null check (round in ('r1', 'r2', 'conf_finals', 'finals')),
  match_id text not null,
  winner_team_id text,
  games integer check (games between 4 and 7),
  finals_mvp_player_id text,
  finals_total_points integer,
  updated_at timestamptz not null default now(),
  primary key (event_id, round, match_id)
);

-- Seed an example bracket config for the 2026 NBA Playoffs event. The
-- commissioner can edit events.config.east/west seeds in /admin. Teams shown
-- here are placeholders until the play-in ends.
update public.events
set config = jsonb_build_object(
  'east', jsonb_build_array(
    jsonb_build_object('seed', 1, 'team', 'BOS'),
    jsonb_build_object('seed', 2, 'team', 'MIL'),
    jsonb_build_object('seed', 3, 'team', 'NYK'),
    jsonb_build_object('seed', 4, 'team', 'CLE'),
    jsonb_build_object('seed', 5, 'team', 'PHI'),
    jsonb_build_object('seed', 6, 'team', 'IND'),
    jsonb_build_object('seed', 7, 'team', 'ORL'),
    jsonb_build_object('seed', 8, 'team', 'MIA')
  ),
  'west', jsonb_build_array(
    jsonb_build_object('seed', 1, 'team', 'OKC'),
    jsonb_build_object('seed', 2, 'team', 'DEN'),
    jsonb_build_object('seed', 3, 'team', 'MIN'),
    jsonb_build_object('seed', 4, 'team', 'LAC'),
    jsonb_build_object('seed', 5, 'team', 'DAL'),
    jsonb_build_object('seed', 6, 'team', 'PHX'),
    jsonb_build_object('seed', 7, 'team', 'LAL'),
    jsonb_build_object('seed', 8, 'team', 'NOP')
  )
)
where slug = '2026-nba-playoffs-bracket'
  and coalesce(config, '{}'::jsonb) = '{}'::jsonb;
