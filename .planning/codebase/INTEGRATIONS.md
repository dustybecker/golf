# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**Sports Data (Import Scripts Only):**
- TheSportsDB API v2 - Source of NFL team and player data for seeding Supabase tables
  - SDK/Client: `requests` (Python HTTP client) in `scripts/import_pool_players_tsdb_v2.py`
  - Base URL: `https://www.thesportsdb.com/api/v2/json`
  - Auth: `THESPORTSDB_API_KEY` env var, sent as `X-API-KEY` header
  - Used only in admin import scripts, not in the Next.js app itself

**Sports Data (Exploration/One-off):**
- nflreadpy - Python library for NFL snap count data
  - Used only in `scripts/import_eligible_players_2025.py` (exploratory, raises SystemExit after head print)

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary and only datastore for the application
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` env var
  - Client library: `@supabase/supabase-js` ^2.90.1
  - Client module: `lib/supabase.ts` exports two clients:
    - `supabase` - anon key client for browser use (key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
    - `supabaseAdmin` - service role client for server-side API routes (key: `SUPABASE_SERVICE_ROLE_KEY`)
  - All API routes (`app/api/**/route.ts`) use `supabaseAdmin` exclusively

**Known Supabase Tables (from schema SQL and API route queries):**
- `golfers` - Golf pool player list with rank/handicap (schema: `supabase/golfers_schema.sql`)
- `draft_picks` - Golfer draft picks per entrant per pool (schema: `supabase/golfers_schema.sql`)
- `pool_entries` - NFL playoff roster submissions (columns: `pool_id`, `entrant_name`, `roster`, `submitted_at`, `updated_at`)
- `pool_teams` - NFL teams with conference/division/playoff status
- `pool_players` - Raw NFL players from TheSportsDB import
- `pool_players_curated` - Curated/filtered player list for roster selection
- `entry_round_lineups` - Scoring view/table with per-entrant per-round points breakdown

**File Storage:**
- Local filesystem only for static assets (`public/`)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system is implemented
- The app uses a Supabase service role key server-side, bypassing Row Level Security (RLS)
- Entrant identity is established by name string input only (no login/session)
- Roster lock is controlled by a server-side constant `ROSTER_LOCK_AT` in `app/api/submit-roster/route.ts` (currently `null` / disabled)

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- `console.error` / `console.log` only (no structured logging framework)
- Python import scripts use `print()` for progress output

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured; `next build` + `next start` scripts suggest any Node.js host or Vercel

**CI Pipeline:**
- None detected (no `.github/`, `.gitlab-ci.yml`, or similar files)

## Environment Configuration

**Required env vars (Next.js app):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (exposed to browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key (exposed to browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, secret)
- `POOL_ID` - (Optional) Default pool identifier for API routes; defaults to `"2026-playoffs"` or `"2026-majors"` depending on route
- `NEXT_PUBLIC_POOL_ID` - (Optional) Client-side pool selector, used in `app/page.tsx`; defaults to `"2026-majors"`

**Required env vars (Python import scripts):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `THESPORTSDB_API_KEY` - TheSportsDB v2 API key
- `POOL_ID` - Pool identifier for seeding (defaults to `"2026-playoffs"`)
- `TSDB_LEAGUE_ID` - TheSportsDB NFL league ID (defaults to `"4391"`)

**Secrets location:**
- Not committed; expected as runtime environment variables or a local `.env` file (read by `python-dotenv` in scripts)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-03-04*
