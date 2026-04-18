-- Extend notification_preferences default to include an `sms` sub-object.
-- Existing rows are backfilled to keep backward compatibility — email
-- preferences are unchanged; SMS is opt-in with sensible defaults for
-- high-urgency channels only.

alter table public.notification_preferences
  alter column prefs set default '{
    "draft_opens": true,
    "draft_turn": true,
    "turn_timer_warn": true,
    "event_lock": true,
    "event_final": true,
    "hot_seat_declared": true,
    "hot_seat_veto": true,
    "season_digest": true,
    "sms": {
      "draft_opens": false,
      "draft_turn": true,
      "turn_timer_warn": true,
      "event_lock": true,
      "event_final": false,
      "hot_seat_declared": false,
      "hot_seat_veto": true,
      "season_digest": false
    }
  }'::jsonb;

-- Backfill existing rows: merge the sms sub-object only if it isn't already set.
update public.notification_preferences
set prefs = prefs || jsonb_build_object(
  'sms', jsonb_build_object(
    'draft_opens', false,
    'draft_turn', true,
    'turn_timer_warn', true,
    'event_lock', true,
    'event_final', false,
    'hot_seat_declared', false,
    'hot_seat_veto', true,
    'season_digest', false
  )
)
where prefs ? 'sms' is not true;
