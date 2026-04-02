# Golf Majors Pool Handoff

## Current Product Shape

This repo is now a golf pool app with five primary surfaces:

- `/` - Home / sign-in / scoring snapshot
- `/draft` - Draft room
- `/admin` - Commissioner tools
- `/leaderboard` - Player leaderboard
- `/tournament` - Tournament leaderboard

The app supports:

- entrant-specific access without full signup
- one shared draft board per tournament-specific pool
- odds-based handicap sync
- live tournament score sync
- player and tournament leaderboards
- light/dark mode with persistent toggle
- lightweight auto-refresh on the main live pages

## Active Architecture

### Frontend

Main pages:

- [app/page.tsx](C:\Users\dusty\playoff-pool-main\app\page.tsx)
- [app/draft/page.tsx](C:\Users\dusty\playoff-pool-main\app\draft\page.tsx)
- [app/admin/page.tsx](C:\Users\dusty\playoff-pool-main\app\admin\page.tsx)
- [app/leaderboard/page.tsx](C:\Users\dusty\playoff-pool-main\app\leaderboard\page.tsx)
- [app/tournament/page.tsx](C:\Users\dusty\playoff-pool-main\app\tournament\page.tsx)

Shell/navigation:

- [app/layout.tsx](C:\Users\dusty\playoff-pool-main\app\layout.tsx)
- [components/SiteNav.tsx](C:\Users\dusty\playoff-pool-main\components\SiteNav.tsx)
- [components/ThemeToggle.tsx](C:\Users\dusty\playoff-pool-main\components\ThemeToggle.tsx)

Theme:

- [app/globals.css](C:\Users\dusty\playoff-pool-main\app\globals.css)
- [tailwind.config.js](C:\Users\dusty\playoff-pool-main\tailwind.config.js)

Polling helper:

- [lib/useAutoRefresh.ts](C:\Users\dusty\playoff-pool-main\lib\useAutoRefresh.ts)

### Backend/API

Auth / entrant session:

- [app/api/entrants/route.ts](C:\Users\dusty\playoff-pool-main\app\api\entrants\route.ts)
- [app/api/auth/me/route.ts](C:\Users\dusty\playoff-pool-main\app\api\auth\me\route.ts)
- [app/api/auth/entrant-login/route.ts](C:\Users\dusty\playoff-pool-main\app\api\auth\entrant-login\route.ts)
- [app/api/auth/logout/route.ts](C:\Users\dusty\playoff-pool-main\app\api\auth\logout\route.ts)
- [app/api/admin/entrant-code/route.ts](C:\Users\dusty\playoff-pool-main\app\api\admin\entrant-code\route.ts)
- [lib/draftAuth.ts](C:\Users\dusty\playoff-pool-main\lib\draftAuth.ts)

Draft:

- [app/api/golfers/route.ts](C:\Users\dusty\playoff-pool-main\app\api\golfers\route.ts)
- [app/api/draft-picks/route.ts](C:\Users\dusty\playoff-pool-main\app\api\draft-picks\route.ts)
- [app/api/draft-picks/add/route.ts](C:\Users\dusty\playoff-pool-main\app\api\draft-picks\add\route.ts)
- [app/api/draft-picks/remove/route.ts](C:\Users\dusty\playoff-pool-main\app\api\draft-picks\remove\route.ts)
- [app/api/draft-picks/reset/route.ts](C:\Users\dusty\playoff-pool-main\app\api\draft-picks\reset\route.ts)

Odds / handicaps:

- [lib/odds.ts](C:\Users\dusty\playoff-pool-main\lib\odds.ts)
- [app/api/odds/[tournament]/route.ts](C:\Users\dusty\playoff-pool-main\app\api\odds\[tournament]\route.ts)
- [app/api/odds/[tournament]/handicaps/route.ts](C:\Users\dusty\playoff-pool-main\app\api\odds\[tournament]\handicaps\route.ts)
- [app/api/odds/[tournament]/sync/route.ts](C:\Users\dusty\playoff-pool-main\app\api\odds\[tournament]\sync\route.ts)

Live scoring:

- [lib/slashGolf.ts](C:\Users\dusty\playoff-pool-main\lib\slashGolf.ts)
- [app/api/slashgolf/schedules/route.ts](C:\Users\dusty\playoff-pool-main\app\api\slashgolf\schedules\route.ts)
- [app/api/slashgolf/leaderboard/route.ts](C:\Users\dusty\playoff-pool-main\app\api\slashgolf\leaderboard\route.ts)
- [app/api/slashgolf/leaderboard/sync/route.ts](C:\Users\dusty\playoff-pool-main\app\api\slashgolf\leaderboard\sync\route.ts)
- [app/api/slashgolf/debug/route.ts](C:\Users\dusty\playoff-pool-main\app\api\slashgolf\debug\route.ts)

Leaderboards / scoring:

- [lib/scoring.ts](C:\Users\dusty\playoff-pool-main\lib\scoring.ts)
- [app/api/leaderboards/player/route.ts](C:\Users\dusty\playoff-pool-main\app\api\leaderboards\player\route.ts)
- [app/api/leaderboards/tournament/route.ts](C:\Users\dusty\playoff-pool-main\app\api\leaderboards\tournament\route.ts)
- [app/api/tournament-meta/route.ts](C:\Users\dusty\playoff-pool-main\app\api\tournament-meta\route.ts)

## Data / Schema

SQL files:

- [supabase/golfers_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\golfers_schema.sql)
- [supabase/entrant_auth_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\entrant_auth_schema.sql)
- [supabase/scoring_schema.sql](C:\Users\dusty\playoff-pool-main\supabase\scoring_schema.sql)

Tables in active use:

- `public.golfers`
- `public.draft_entrants`
- `public.draft_sessions`
- `public.draft_picks`
- `public.tournament_meta`
- `public.tournament_round_scores`

## Important Behavior

### Home

- landing page for new visitors
- sign-in happens here
- shows quick player/tournament scoring snapshot
- directs users into Draft/Admin/full leaderboards

### Draft

- entrant-facing page
- requires sign-in from Home for actual pick actions
- golfers lock globally within the current pool
- admin can still reset the board from here

### Admin

Three sections:

1. `Odds And Handicap Sync`
- use before the draft
- preview and sync The Odds API handicap model

2. `Entrant Access`
- use when creating/resetting player access codes
- generates invite link + code

3. `Tournament Score Sync`
- use during or after rounds
- searches Slash Golf schedule
- syncs tournament leaderboard rows into `tournament_round_scores`

### Player Leaderboard

- standings table is the default
- ranks entrants by current best four net golfer scores
- entrant selector shows full six-golfer scorecard:
  - current best four
  - bench / tiebreak golfers

### Tournament Leaderboard

- real tournament board only
- shows raw strokes and score to par
- does not use handicap

## Scoring Rules In Code

Implemented in [lib/scoring.ts](C:\Users\dusty\playoff-pool-main\lib\scoring.ts).

Current behavior:

- player leaderboard uses lowest four net scores
- bench golfers determine tiebreak positions
- tournament leaderboard uses gross raw strokes only
- if a round row has actual strokes, those strokes are always used
- cut/WD/DQ/DNS penalties only apply when a later round has no real stroke row
- cut players get field-worst played score for each unplayed round
- WD/DQ/DNS get `round_par + 8` for each affected round

This was specifically fixed after a bug where real cut-round scores were being overwritten by penalties.

## Auto Refresh

Polling is implemented on the main live views:

- Home refreshes every 30 seconds
- Draft refreshes every 15 seconds
- Player leaderboard refreshes every 30 seconds
- Tournament leaderboard refreshes every 30 seconds

Each page also shows a visible "Last updated" timestamp after successful refreshes.

## External Services

### Supabase

Used for:

- entrants
- sessions
- golfers
- draft picks
- tournament metadata
- round scores

### The Odds API

Used for:

- outright odds
- implied probability
- handicap generation

Required env:

- `ODDS_API_KEY`

### Slash Golf / RapidAPI

Used for:

- schedule lookup
- tournament leaderboard sync

Required env:

- `SLASH_GOLF_API_KEY`

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

App config:

- `NEXT_PUBLIC_POOL_ID`
- `POOL_ID`
- `ODDS_API_KEY`
- `SLASH_GOLF_API_KEY`

## Current Conventions

The app currently isolates tournaments by derived pool ids:

- `2026-majors-masters`
- `2026-majors-pga-championship`
- `2026-majors-us-open`
- `2026-majors-the-open`

This works, but it is convention-based rather than schema-based.

## Known Gaps

1. Polling is lightweight, not realtime
- good enough for most use
- not true push-based updates

2. Tournament isolation is still pool-id naming convention
- no dedicated tournament/event foreign key model yet

3. Admin reset still exists on the Draft page
- intentional for now, but could move fully into Admin if desired

4. Entrant rows must be seeded with real access code hashes
- sample hashes in SQL are placeholders

5. There is still an unrelated nested project in this repo:
- `bon-iver-ranker/`

## Deployment Checklist

Before deploying:

1. Set Vercel env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_POOL_ID`
- `POOL_ID`
- `ODDS_API_KEY`
- `SLASH_GOLF_API_KEY`

2. Run and verify SQL in Supabase:
- golfers schema
- entrant auth schema
- scoring schema

3. Seed at least:
- one admin entrant
- one normal entrant
- real access code hashes

4. Verify:
- normal entrant can sign in and only draft for self
- admin can access `/admin`
- odds sync works
- Slash score sync works
- player leaderboard and tournament leaderboard both load

5. Confirm API plan limits are acceptable:
- The Odds API
- Slash Golf

6. Test the current polling cadence during a live session.

7. Do a final mobile check on Home, Draft, Admin, and both leaderboard pages.

## Recommended Next Steps

1. Decide whether lightweight polling is sufficient or whether Supabase realtime is worth adding
2. Decide whether to formalize tournament identity in schema instead of encoded pool ids
3. Continue mobile layout polish on Home/Admin/leaderboards
4. Optionally move final admin-only reset controls entirely into `/admin`
