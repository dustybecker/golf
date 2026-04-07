# Golf Majors Pool

Next.js + Supabase app for running a private golf majors pool with:

- home/sign-in landing page
- entrant-specific draft access
- admin tools for codes, odds sync, and score sync
- player leaderboard
- tournament leaderboard

## Routes

UI:

- `/` - Home / sign-in / scoring snapshot
- `/draft` - Draft room
- `/admin` - Commissioner tools
- `/leaderboard` - Player leaderboard
- `/tournament` - Tournament leaderboard

API:

- `/api/entrants`
- `/api/auth/me`
- `/api/auth/entrant-login`
- `/api/auth/logout`
- `/api/admin/entrant-code`
- `/api/admin/draft-state`
- `/api/admin/draft-reset`
- `/api/admin/entrant-auto-draft`
- `/api/golfers`
- `/api/draft-picks`
- `/api/draft-picks/add`
- `/api/draft-picks/remove`
- `/api/draft-picks/reset`
- `/api/draft-state`
- `/api/leaderboards/player`
- `/api/leaderboards/tournament`
- `/api/tournament-meta`
- `/api/slashgolf/schedules`
- `/api/slashgolf/leaderboard`
- `/api/slashgolf/leaderboard/sync`
- `/api/slashgolf/debug`
- `/api/odds/[tournament]`
- `/api/odds/[tournament]/handicaps`
- `/api/odds/[tournament]/sync`

Supported tournament slugs:

- `masters`
- `pga-championship`
- `us-open`
- `the-open`

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_POOL_ID=2026-majors
POOL_ID=2026-majors
ODDS_API_KEY=...
SLASH_GOLF_API_KEY=...
```

Run the SQL setup in Supabase:

- [supabase/golfers_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\golfers_schema.sql)
- [supabase/entrant_auth_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\entrant_auth_schema.sql)
- [supabase/scoring_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\scoring_schema.sql)
- [supabase/draft_lock_patch.sql](C:\Users\dusty\playoff-pool-main\supabase\draft_lock_patch.sql)
- [supabase/draft_turns_patch.sql](C:\Users\dusty\playoff-pool-main\supabase\draft_turns_patch.sql)

Then start the app:

```bash
npm run dev
```

If PowerShell blocks `npm`:

```bash
npm.cmd run dev
```

## Current Flow

### Home

- first-time visitors land on `/`
- sign in with `entrant_slug + access_code`
- see quick scoring snapshots
- navigate to Draft, Admin, or full leaderboard views

### Draft

- `/draft` is the entrant-facing draft room
- golfers are loaded from `public.golfers`
- picks are loaded from `public.draft_picks`
- each entrant can only draft for themselves
- drafted golfers disappear from the visible board
- draft order is a fixed 9-entrant snake draft based on `draft_position`
- only the entrant currently on the clock can make a manual pick
- entrants can toggle their own auto-draft setting from the Draft page
- if a timer expires, that entrant is automatically flipped to auto-draft
- the countdown is shown as `HH:MM:SS`

### Admin

- `/admin` is the commissioner page
- `Draft Controls`
  - manually open / lock the draft
  - full `Reset To Pre-Draft`
- `Odds And Handicap Sync`
  - use before the draft
  - preview odds-derived handicaps
  - sync golfers into the current tournament pool
- `Entrant Access`
  - generate or reset player codes
  - send the invite link + generated code
  - toggle auto-draft for any entrant
- `Tournament Score Sync`
  - search Slash Golf schedules
  - select a tournament
  - sync round scores into `tournament_round_scores`

### Leaderboards

- `/leaderboard`
  - standings by each entrant's current best four net golfer scores
  - entrant selector for full six-golfer scorecard
- `/tournament`
  - real tournament leaderboard
  - raw strokes, to par, round scores, and drafted-by

## Data Model

### `public.golfers`

- `pool_id`
- `rank`
- `golfer`
- `handicap`

### `public.draft_entrants`

- entrant identity and access-code hashes

### `public.draft_sessions`

- session storage for HTTP-only entrant login cookies

### `public.draft_picks`

- `pool_id`
- `entrant_id`
- `entrant_name`
- `golfer`
- `pick_number`

### `public.draft_state`

- current snake draft pointer
- current round
- current entrant on the clock
- turn timing

### `public.tournament_meta`

- `pool_id`
- `tournament_slug`
- `round_count`
- `round_par`

### `public.tournament_round_scores`

- `pool_id`
- `tournament_slug`
- `golfer`
- `round_number`
- `strokes`
- `score_status`
- `position`
- `position_text`

## Notes

- tournament isolation currently uses derived pool ids like:
  - `2026-majors-masters`
  - `2026-majors-pga-championship`
- Slash Golf is the live scoring source
- The Odds API is the handicap source
- the draft currently expects exactly `9` entrants
- the draft timer is `2 hours`
- the draft is effectively active only from `9AM` to `9PM` Pacific
- timers pause overnight instead of expiring while people are away
- lightweight polling is implemented:
  - Home `30s`
  - Draft `30s`
  - Player leaderboard `30s`
  - Tournament leaderboard `30s`

## Deployment Checklist

Before shipping:

1. Set all production env vars in Vercel.
2. Confirm `.env.local` values match the intended Supabase project and pool id.
3. Seed real entrant rows and real access code hashes.
4. Verify one non-admin entrant can:
   - sign in
   - draft for self only
   - not access admin actions
5. Verify one admin entrant can:
   - generate/reset codes
   - sync odds
   - sync tournament scores
6. Confirm Slash Golf and The Odds API plan limits are sufficient.
7. Do a final mobile check on Home, Draft, Admin, and both leaderboard pages.
8. Verify the polling cadence feels acceptable during live use.
9. If you run a simulated draft, use `Reset To Pre-Draft` before the real draft.

## Handoff

Full project notes:

- [HANDOFF.md](C:\Users\dusty\playoff-pool-main\HANDOFF.md)
