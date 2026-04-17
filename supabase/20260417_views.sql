-- Season-long leaderboard view. Sums finalized event points plus bonus
-- awards per season member. Provisional (live/in-flight) events are not
-- reflected here; those are computed on the client from event handlers.
create or replace view public.v_season_leaderboard as
with finish_totals as (
  select
    e.season_id,
    ef.entrant_id,
    coalesce(sum(ef.awarded_points), 0)::numeric as event_points,
    count(*) as events_scored
  from public.event_finishes ef
  join public.events e on e.event_id = ef.event_id
  group by e.season_id, ef.entrant_id
),
bonus_totals as (
  select
    ba.season_id,
    ba.entrant_id,
    coalesce(sum(ba.points), 0)::numeric as bonus_points,
    count(*) as bonuses_earned
  from public.bonus_awards ba
  group by ba.season_id, ba.entrant_id
)
select
  sm.season_id,
  sm.entrant_id,
  sm.display_name,
  sm.seat_order,
  coalesce(ft.event_points, 0) as event_points,
  coalesce(bt.bonus_points, 0) as bonus_points,
  coalesce(ft.event_points, 0) + coalesce(bt.bonus_points, 0) as total_points,
  coalesce(ft.events_scored, 0) as events_scored,
  coalesce(bt.bonuses_earned, 0) as bonuses_earned
from public.season_members sm
left join finish_totals ft
  on ft.season_id = sm.season_id and ft.entrant_id = sm.entrant_id
left join bonus_totals bt
  on bt.season_id = sm.season_id and bt.entrant_id = sm.entrant_id;
