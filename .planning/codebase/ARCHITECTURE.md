# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Next.js App Router — thin API layer over Supabase, with client-side React pages consuming those APIs

**Key Characteristics:**
- No server components used for data rendering — all pages are `"use client"` with fetch-on-mount patterns
- API routes act as a thin proxy/validation layer between the browser and Supabase (service role)
- Two parallel domains in one repo: an NFL playoff pool (`2026-playoffs`) and a golf majors draft (`2026-majors`), sharing the same Supabase backend via `pool_id` discrimination
- A third nested project (`bon-iver-ranker/`) is a wholly separate Next.js app with its own git history and `.next` build — it shares the same `public/bon-iver` assets folder

## Layers

**Client Pages (UI Layer):**
- Purpose: Render interactive UI, manage local state, call internal API routes
- Location: `app/page.tsx`, `components/RosterBuilder.tsx`
- Contains: React hooks, optimistic state updates, fallback data, form logic
- Depends on: Internal API routes (`/api/*`)
- Used by: End users via browser

**API Route Layer:**
- Purpose: Input validation, Supabase Admin queries, data transformation before returning JSON
- Location: `app/api/*/route.ts`
- Contains: `GET` and `POST` handlers, inline TypeScript type definitions, business rule validation
- Depends on: `lib/supabase.ts` (`supabaseAdmin` client), `pool_id` param to scope queries
- Used by: Client pages via `fetch()`

**Data Access Layer:**
- Purpose: Singleton Supabase client construction — both anon and service-role variants
- Location: `lib/supabase.ts`
- Contains: `supabase` (anon, for client-side use) and `supabaseAdmin` (service role, used in all API routes)
- Depends on: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Used by: All `app/api/*/route.ts` files

**Static Data / Domain Types:**
- Purpose: Hard-coded reference data and type definitions not yet migrated to Supabase
- Location: `lib/playoffData.ts`, `lib/songs.ts`, `data/songs.json`
- Contains: `playoffTeams`, `playersByTeam` (14 NFL teams, ~6 players each), song albums/tracks
- Depends on: `data/songs.json` (imported via `resolveJsonModule`)
- Used by: Currently unused in rendered pages (legacy data — active pages fetch from Supabase instead)

**Components:**
- Purpose: Shared UI components used across pages
- Location: `components/`
- Contains: `BottomNav.tsx` (tab navigation), `RosterBuilder.tsx` (NFL roster slot builder)
- Depends on: Internal API routes via `fetch()`
- Used by: Pages

**Database Schema:**
- Purpose: Supabase table definitions
- Location: `supabase/golfers_schema.sql`
- Contains: `golfers` table, `draft_picks` table with uniqueness constraints
- Implicit tables (used by API routes but not in schema file): `pool_entries`, `pool_players_curated`, `pool_teams`, `entry_round_lineups`

## Data Flow

**Draft Board (Golf Majors) — Read:**
1. `app/page.tsx` mounts with `"use client"` directive
2. `useEffect` fires two parallel fetches: `GET /api/golfers?pool_id=2026-majors` and `GET /api/draft-picks?pool_id=2026-majors`
3. `app/api/golfers/route.ts` queries `supabaseAdmin` → `golfers` table filtered by `pool_id`
4. `app/api/draft-picks/route.ts` queries `supabaseAdmin` → `draft_picks` table filtered by `pool_id`
5. Page state is updated; fallback golfer list (`FALLBACK_GOLFERS`) is used if Supabase fails

**Draft Board (Golf Majors) — Write:**
1. User clicks "Draft" for a golfer
2. Optimistic local state update applied immediately
3. `POST /api/draft-picks` called with full `picks_by_entrant` payload
4. API validates: max picks per entrant (6), no duplicate golfers, all golfers exist in pool
5. API deletes existing picks for the pool then re-inserts the full set (replace strategy)
6. On API error, optimistic state is rolled back to prior snapshot

**NFL Roster Submission:**
1. `components/RosterBuilder.tsx` fetches `GET /api/teams?pool_id=2026-playoffs` and `GET /api/players?pool_id=2026-playoffs` on mount
2. User selects players into typed slots (`AFC_QB`, `NFC_FLEX1`, etc.) via a modal picker
3. On submit, `POST /api/submit-roster` validates slot positions, conference constraints, and no duplicates
4. API upserts to `pool_entries` table with conflict key `(pool_id, entrant_name)`

**Leaderboard / Scoring:**
1. `GET /api/leaderboard` queries the `entry_round_lineups` view/table
2. Aggregates `points` per entrant grouped by round (1–4) and totals
3. `GET /api/scoring-breakdown` returns flat per-slot-per-round rows from the same table

**State Management:**
- All state is local React `useState` — no global state library (no Redux, Zustand, etc.)
- Optimistic updates on draft picks with rollback on API failure
- Loading/error states tracked per data source with boolean flags and nullable error strings

## Key Abstractions

**pool_id:**
- Purpose: Multi-tenancy key that scopes all Supabase queries — `"2026-majors"` for golf, `"2026-playoffs"` for NFL
- Examples: Used as query param in every API route; defaults fall back to hard-coded pool IDs
- Pattern: `url.searchParams.get("pool_id") || process.env.POOL_ID || "2026-playoffs"`

**SlotId (NFL Roster):**
- Purpose: Typed identifier for roster positions — `${Conference}_${SlotBase}` e.g. `AFC_QB`, `NFC_FLEX1`
- Examples: `components/RosterBuilder.tsx`, `app/api/submit-roster/route.ts`
- Pattern: Template literal type `type SlotId = \`${Conference}_${SlotBase}\``; SLOTS array defines allowed positions per slot

**supabaseAdmin:**
- Purpose: Service-role Supabase client used exclusively in API routes (never exposed to browser)
- Examples: `lib/supabase.ts`, imported in all `app/api/*/route.ts`
- Pattern: All database writes and admin reads go through `supabaseAdmin`; `supabase` (anon) is defined but not actively used in current pages

## Entry Points

**Root Draft Page:**
- Location: `app/page.tsx`
- Triggers: Browser navigating to `/`
- Responsibilities: Golf majors draft board — load golfers and picks, allow entrant-by-entrant pick selection, persist to Supabase

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Wraps all pages
- Responsibilities: Sets HTML shell, global CSS, `max-w-6xl` container; does NOT include `BottomNav` (navigation is tab-defined in the component but not yet wired into layout)

**API Routes (all in `app/api/`):**
- `GET /api/golfers` — List golfers for a pool
- `GET|POST /api/draft-picks` — Read/write golf draft picks
- `GET /api/rosters` — List NFL pool entries
- `POST /api/submit-roster` — Submit/upsert validated NFL roster
- `POST /api/edit-roster` — Admin edit of roster without strict validation
- `GET /api/players` — List NFL players with optional filtering
- `GET /api/teams` — List playoff teams for a pool
- `GET /api/leaderboard` — Aggregated points leaderboard
- `GET /api/scoring-breakdown` — Per-slot-per-round scoring rows

## Error Handling

**Strategy:** Inline per-call try/catch in client components; API routes return `NextResponse.json({ error })` with appropriate HTTP status codes

**Patterns:**
- API routes return `{ error: string, status: 4xx|500 }` on failure
- Client components show inline error messages (e.g., `picksError && <div className="text-danger">...`) without toast or modal infrastructure
- Optimistic updates include rollback: `setPicksByEntrant(picksByEntrant)` called in catch block
- Golfer list has a hard-coded `FALLBACK_GOLFERS` array displayed if the Supabase fetch fails
- Cancellation tokens (`let cancelled = false`) used in `useEffect` to prevent state updates on unmounted components

## Cross-Cutting Concerns

**Logging:** None — no logging framework; errors surface only as state strings shown in UI
**Validation:** Inline in API route handlers; no shared validation library (e.g., Zod not used)
**Authentication:** None — no auth system; entrant name is a plain text field; `supabaseAdmin` with service role key bypasses RLS entirely

---

*Architecture analysis: 2026-03-04*
