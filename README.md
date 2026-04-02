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
- `/api/golfers`
- `/api/draft-picks`
- `/api/draft-picks/add`
- `/api/draft-picks/remove`
- `/api/draft-picks/reset`
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
- each entrant can only edit their own picks
- golfers lock across the whole pool once drafted

### Admin

- `/admin` is the commissioner page
- `Odds And Handicap Sync`
  - use before the draft
  - preview odds-derived handicaps
  - sync golfers into the current tournament pool
- `Entrant Access`
  - generate or reset player codes
  - send the invite link + generated code
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
- lightweight polling is implemented:
  - Home `30s`
  - Draft `15s`
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

## Handoff

Full project notes:

- [HANDOFF.md](C:\Users\dusty\playoff-pool-main\HANDOFF.md)
