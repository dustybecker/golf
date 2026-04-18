-- Seed the 2026 Ultimate Sports Decathlon season, members, and every event
-- in the rulebook. Idempotent: safe to re-run. Dates are best-known 2026
-- target dates and can be adjusted by the commissioner in /admin.

insert into public.seasons (year, label, started_at)
values (2026, '2026 Ultimate Sports Decathlon', '2026-01-12 00:00:00-08')
on conflict (year) do update
  set label = excluded.label,
      started_at = coalesce(public.seasons.started_at, excluded.started_at);

-- Backfill person_key on existing Masters pool entrants using their slug.
-- person_key is stable across pools so the same human in the US Open pool
-- (future) links to the same season_members row.
update public.draft_entrants
set person_key = entrant_slug
where pool_id = '2026-majors-masters'
  and person_key is null;

-- Seed season_members from the Masters pool (the canonical 6 for 2026).
insert into public.season_members (season_id, entrant_id, display_name, seat_order)
select
  s.season_id,
  de.entrant_id,
  de.entrant_name,
  coalesce(de.draft_position, row_number() over (order by de.entrant_name))
from public.seasons s
cross join public.draft_entrants de
where s.year = 2026
  and de.pool_id = '2026-majors-masters'
on conflict (season_id, entrant_id) do update
  set display_name = excluded.display_name,
      seat_order = excluded.seat_order;

-- Helper: insert an event row bound to the 2026 season.
-- Uses DO block to compute season_id once.
do $$
declare
  v_season_id uuid;
begin
  select season_id into v_season_id from public.seasons where year = 2026;
  if v_season_id is null then
    raise exception 'seed failed: 2026 season missing';
  end if;

  -- ============================================================
  -- Tier 3 (5x) — The Crown Jewels
  -- ============================================================
  insert into public.events (season_id, slug, name, event_type, tier, status, starts_at, ends_at, lock_at, legacy_pool_id, config)
  values
    (v_season_id, '2026-nfl-playoff-roster', 'NFL Playoff Roster Draft', 'roster-draft', 3, 'final',
       '2026-01-10', '2026-02-08', '2026-01-09 17:00-08', null, '{}'),
    (v_season_id, '2026-super-bowl', 'The Super Bowl Extravaganza', 'prop-sheet', 3, 'final',
       '2026-02-08', '2026-02-09', '2026-02-08 15:00-08', null, '{}'),
    (v_season_id, '2026-march-madness', 'March Madness Overall Bracket', 'bracket-march-madness', 3, 'final',
       '2026-03-17', '2026-04-06', '2026-03-17 09:00-07', null, '{}'),
    (v_season_id, '2026-masters', 'The Masters', 'golf-draft', 3, 'live',
       '2026-04-09', '2026-04-12', '2026-04-08 17:00-04', '2026-majors-masters',
       '{"round_count": 4, "round_par": 72, "tournament_slug": "masters"}'),
    (v_season_id, '2026-us-open-golf', 'U.S. Open (Golf)', 'golf-draft', 3, 'scheduled',
       '2026-06-18', '2026-06-21', '2026-06-17 17:00-04', null,
       '{"round_count": 4, "round_par": 70, "tournament_slug": "us-open"}'),
    (v_season_id, '2026-world-cup', '2026 FIFA World Cup', 'bracket-world-cup', 3, 'scheduled',
       '2026-06-11', '2026-07-19', '2026-06-11 12:00-07', null, '{}')
  on conflict (season_id, slug) do update
    set name = excluded.name,
        event_type = excluded.event_type,
        tier = excluded.tier,
        legacy_pool_id = coalesce(public.events.legacy_pool_id, excluded.legacy_pool_id);

  -- ============================================================
  -- Tier 2 (2.5x) — Premium Events
  -- ============================================================
  insert into public.events (season_id, slug, name, event_type, tier, status, starts_at, ends_at, lock_at, config)
  values
    (v_season_id, '2026-cfp-championship', 'CFP National Championship', 'prop-sheet', 2, 'final',
       '2026-01-19', '2026-01-20', '2026-01-19 17:00-08', '{}'),
    (v_season_id, '2026-pdc-darts', 'PDC World Darts Championship', 'darts-draft', 2, 'final',
       '2025-12-15', '2026-01-03', '2025-12-15 12:00-08', '{}'),
    (v_season_id, '2026-daytona-500', 'The Daytona 500', 'driver-draft', 2, 'final',
       '2026-02-15', '2026-02-15', '2026-02-15 11:00-05', '{}'),
    (v_season_id, '2026-wrestlemania', 'WrestleMania', 'prop-sheet', 2, 'final',
       '2026-04-04', '2026-04-05', '2026-04-04 14:00-07', '{}'),
    (v_season_id, '2026-kentucky-derby', 'The Kentucky Derby', 'horse-draft', 2, 'scheduled',
       '2026-05-02', '2026-05-02', '2026-05-02 14:00-04', '{}'),
    (v_season_id, '2026-players', 'The PLAYERS Championship', 'golf-draft', 2, 'final',
       '2026-03-12', '2026-03-15', '2026-03-11 17:00-04', '{"round_count": 4, "round_par": 72, "tournament_slug": "the-players"}'),
    (v_season_id, '2026-pga-championship', 'PGA Championship', 'golf-draft', 2, 'scheduled',
       '2026-05-14', '2026-05-17', '2026-05-13 17:00-04', '{"round_count": 4, "round_par": 72, "tournament_slug": "pga-championship"}'),
    (v_season_id, '2026-the-open', 'The Open Championship', 'golf-draft', 2, 'scheduled',
       '2026-07-16', '2026-07-19', '2026-07-15 17:00-04', '{"round_count": 4, "round_par": 71, "tournament_slug": "the-open"}'),
    (v_season_id, '2026-tour-championship', 'Tour Championship / FedEx Cup', 'golf-draft', 2, 'scheduled',
       '2026-08-20', '2026-08-23', '2026-08-19 17:00-04', '{"round_count": 4, "round_par": 70, "tournament_slug": "tour-championship"}'),
    (v_season_id, '2026-presidents-cup', 'Presidents Cup', 'golf-team-draft', 2, 'scheduled',
       '2026-09-24', '2026-09-27', '2026-09-23 17:00-04', '{}'),
    (v_season_id, '2026-nba-finals', 'NBA Finals', 'series-props', 2, 'scheduled',
       '2026-06-04', '2026-06-21', '2026-06-04 18:00-07', '{}'),
    (v_season_id, '2026-stanley-cup', 'NHL Stanley Cup Final', 'series-props', 2, 'scheduled',
       '2026-06-03', '2026-06-20', '2026-06-03 18:00-07', '{}'),
    (v_season_id, '2026-world-series', 'MLB World Series', 'series-props', 2, 'scheduled',
       '2026-10-23', '2026-11-04', '2026-10-23 17:00-07', '{}'),
    (v_season_id, '2026-wimbledon', 'Wimbledon', 'tennis-draft', 2, 'scheduled',
       '2026-06-29', '2026-07-12', '2026-06-28 17:00-04', '{}')
  on conflict (season_id, slug) do update
    set name = excluded.name,
        event_type = excluded.event_type,
        tier = excluded.tier;

  -- ============================================================
  -- Tier 1 (1x) — Regular Season & Early Playoffs
  -- ============================================================

  -- NFL Weekly Picks (Weeks 1-18) — each its own event, grouped for UI rollup
  for wk in 1..18 loop
    insert into public.events (season_id, slug, name, event_type, tier, status, starts_at, lock_at, group_key, config)
    values
      (v_season_id,
       format('2026-nfl-pickem-w%s', lpad(wk::text, 2, '0')),
       format('NFL Week %s Picks', wk),
       'pickem-ats',
       1,
       'scheduled',
       (date '2026-09-10' + ((wk - 1) * 7))::timestamptz,
       (date '2026-09-10' + ((wk - 1) * 7) + time '10:00')::timestamptz at time zone 'America/Los_Angeles',
       'nfl-weekly-picks',
       jsonb_build_object('week', wk, 'picks_required', 5))
    on conflict (season_id, slug) do nothing;
  end loop;

  -- NFL Draft (first-round props)
  insert into public.events (season_id, slug, name, event_type, tier, status, starts_at, ends_at, lock_at, config)
  values
    (v_season_id, '2026-nfl-draft', 'NFL Draft (Round 1 Props)', 'prop-sheet', 1, 'scheduled',
       '2026-04-23', '2026-04-23', '2026-04-23 17:00-04', '{}'),

    -- Golf Tier 1
    (v_season_id, '2026-wm-phoenix-open', 'WM Phoenix Open', 'golf-draft', 1, 'final',
       '2026-02-05', '2026-02-08', '2026-02-04 17:00-07', '{"round_count": 4, "round_par": 71, "tournament_slug": "wm-phoenix-open"}'),
    (v_season_id, '2026-api', 'Arnold Palmer Invitational', 'golf-draft', 1, 'final',
       '2026-03-05', '2026-03-08', '2026-03-04 17:00-04', '{"round_count": 4, "round_par": 72, "tournament_slug": "arnold-palmer-invitational"}'),
    (v_season_id, '2026-memorial', 'The Memorial Tournament', 'golf-draft', 1, 'scheduled',
       '2026-06-04', '2026-06-07', '2026-06-03 17:00-04', '{"round_count": 4, "round_par": 72, "tournament_slug": "memorial-tournament"}'),

    -- Bracket series (pick winners before playoffs)
    (v_season_id, '2026-nba-playoffs-bracket', 'NBA Playoffs Bracket', 'bracket-nba', 1, 'open-entry',
       '2026-04-18', '2026-06-21', '2026-04-18 15:00-07', '{}'),
    (v_season_id, '2026-nhl-playoffs-bracket', 'NHL Playoffs Bracket', 'bracket-nhl', 1, 'open-entry',
       '2026-04-18', '2026-06-20', '2026-04-18 15:00-07', '{}'),
    (v_season_id, '2026-mlb-playoffs-bracket', 'MLB Playoffs Bracket', 'bracket-mlb', 1, 'scheduled',
       '2026-09-29', '2026-11-04', '2026-09-29 15:00-07', '{}')
  on conflict (season_id, slug) do update
    set name = excluded.name,
        event_type = excluded.event_type,
        tier = excluded.tier;
end $$;
