# Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
playoff-pool-main/
├── app/                        # Next.js App Router root
│   ├── layout.tsx              # Root HTML shell, global CSS import, max-w-6xl container
│   ├── page.tsx                # Golf majors draft board (root route "/")
│   ├── globals.css             # Global Tailwind CSS imports
│   ├── favicon.ico
│   └── api/                   # API route handlers (server-side)
│       ├── draft-picks/
│       │   └── route.ts        # GET/POST golf draft picks
│       ├── edit-roster/
│       │   └── route.ts        # POST admin roster edit (no strict validation)
│       ├── golfers/
│       │   └── route.ts        # GET golfers list for a pool
│       ├── leaderboard/
│       │   └── route.ts        # GET aggregated points leaderboard
│       ├── players/
│       │   └── route.ts        # GET NFL players with optional filtering
│       ├── rosters/
│       │   └── route.ts        # GET NFL pool entries
│       ├── scoring-breakdown/
│       │   └── route.ts        # GET per-slot-per-round scoring rows
│       ├── submit-roster/
│       │   └── route.ts        # POST validated NFL roster upsert
│       └── teams/
│           └── route.ts        # GET playoff teams for a pool
├── components/                 # Shared React components
│   ├── BottomNav.tsx           # Tab navigation component
│   └── RosterBuilder.tsx       # NFL roster slot builder (large component, ~500+ lines)
├── lib/                        # Shared utilities and data
│   ├── supabase.ts             # Supabase client singletons (anon + service role)
│   ├── playoffData.ts          # Hard-coded NFL teams/players (legacy, not used in pages)
│   └── songs.ts                # Bon Iver song data types (legacy)
├── data/
│   └── songs.json              # Bon Iver album/track data (used by songs.ts)
├── scripts/                    # Ad-hoc Python data import scripts
│   ├── find_nfl_league_tsdb_v2.py
│   ├── import_eligible_players_2025.py
│   ├── import_pool_players_tsdb.py
│   ├── import_pool_players_tsdb_v1.py
│   ├── import_pool_players_tsdb_v2.py
│   ├── import_pool_players_tsdb_v2_list.py
│   ├── tsdb_probe_v2_endpoints.py
│   ├── tsdb_test.py
│   └── tsdb_v2_list_teams_test.py
├── supabase/
│   └── golfers_schema.sql      # SQL schema for golfers and draft_picks tables
├── public/                     # Static assets
│   ├── bon-iver/               # Album cover images for Bon Iver ranker sub-project
│   └── *.svg                   # Next.js default SVG assets
├── bon-iver-ranker/            # Separate nested Next.js app (own git history, own .next)
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # This codebase map
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint flat config
├── postcss.config.js           # PostCSS config
├── postcss.config.mjs          # PostCSS config (duplicate, .mjs variant)
└── package.json                # Dependencies and scripts
```

## Key File Locations

| Purpose | File |
|---------|------|
| Supabase clients (anon + admin) | `lib/supabase.ts` |
| Root page (golf draft board) | `app/page.tsx` |
| NFL roster builder component | `components/RosterBuilder.tsx` |
| Root layout | `app/layout.tsx` |
| All API handlers | `app/api/*/route.ts` |
| DB schema (partial) | `supabase/golfers_schema.sql` |
| NFL teams/players static data | `lib/playoffData.ts` |

## Naming Conventions

**Files:**
- React components: PascalCase (`RosterBuilder.tsx`, `BottomNav.tsx`)
- API routes: kebab-case directories, always `route.ts` (`app/api/submit-roster/route.ts`)
- Library utilities: camelCase (`supabase.ts`, `playoffData.ts`)
- Config files: lowercase with standard extensions (`tailwind.config.js`, `next.config.ts`)

**TypeScript:**
- Inline type definitions within each API route file (no shared type library)
- Template literal types for composite IDs: `type SlotId = \`${Conference}_${SlotBase}\``
- Interfaces named with PascalCase: `Golfer`, `DraftPicks`, `RosterSlot`
- Environment variables: `NEXT_PUBLIC_` prefix for public vars, plain for server-only

**Database / API:**
- Pool scoping: `pool_id` query param on every API route (e.g. `"2026-playoffs"`, `"2026-majors"`)
- REST-style routes: GET for reads, POST for writes (no PUT/PATCH/DELETE pattern used)
- Table names: snake_case (`pool_entries`, `pool_players_curated`, `entry_round_lineups`)

## Where to Add New Code

| What | Where |
|------|-------|
| New API endpoint | `app/api/<endpoint-name>/route.ts` |
| New page/route | `app/<route-name>/page.tsx` |
| New shared component | `components/<ComponentName>.tsx` |
| New shared utility/type | `lib/<utility-name>.ts` |
| New DB migration | `supabase/<description>.sql` |
| Data import script | `scripts/<description>.py` |

## Notable Structural Issues

- **Duplicate PostCSS config:** Both `postcss.config.js` and `postcss.config.mjs` exist — likely a migration artifact
- **Nested independent app:** `bon-iver-ranker/` is a separate Next.js project inside this repo root — not integrated into the main app router
- **Legacy data files:** `lib/playoffData.ts` and `lib/songs.ts` / `data/songs.json` are not imported by any active page (dead code)
- **No shared types directory:** Type definitions are inlined per-file rather than shared from a central `types/` folder

---

*Structure analysis: 2026-03-04*
