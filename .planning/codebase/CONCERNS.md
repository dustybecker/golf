# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**Inconsistent hardcoded pool IDs across all routes:**
- Issue: `pool_id` defaults are hardcoded directly in every API route and in `components/RosterBuilder.tsx`. The values are inconsistent — the golfers/draft-picks routes default to `"2026-majors"` while the leaderboard, players, rosters, and scoring-breakdown routes default to `"2026-playoffs"`. Whenever `pool_id` is omitted or the env var is absent, different routes silently read from different pools.
- Files: `app/api/draft-picks/route.ts` (line 17), `app/api/golfers/route.ts` (line 15), `app/api/leaderboard/route.ts` (line 16), `app/api/players/route.ts` (line 7), `app/api/scoring-breakdown/route.ts` (line 20), `components/RosterBuilder.tsx` (line 85)
- Impact: Silent data mismatches between features — e.g., leaderboard reads `"2026-playoffs"` while draft board writes `"2026-majors"`.
- Fix approach: Centralize the default pool ID in a single constant in `lib/` (e.g., `lib/poolConfig.ts`) and import it everywhere. Remove per-route literals.

**Stale hardcoded player data in `lib/playoffData.ts`:**
- Issue: `lib/playoffData.ts` contains a full hardcoded roster of 2024-era NFL playoff teams and players (e.g., Stefon Diggs on Bills, Aaron Jones on Packers, Joe Flacco on Browns). This file is never imported by any active route or component — the live app pulls from Supabase via `pool_players_curated`. It is dead code.
- Files: `lib/playoffData.ts`
- Impact: Misleads developers into thinking this is the authoritative player source. Could be accidentally wired in during future development with outdated data.
- Fix approach: Delete `lib/playoffData.ts`, or clearly comment it as a historical seed reference only.

**`lib/songs.ts` and `data/songs.json` duplicated into `bon-iver-ranker/`:**
- Issue: `lib/songs.ts` and `data/songs.json` exist identically at both the root `/lib/songs.ts` + `/data/songs.json` and `/bon-iver-ranker/lib/songs.ts` + `/bon-iver-ranker/data/songs.json`. The bon-iver-ranker is a separate Next.js project living inside the playoff pool repo.
- Files: `lib/songs.ts`, `bon-iver-ranker/lib/songs.ts`, `data/songs.json`, `bon-iver-ranker/data/songs.json`
- Impact: Two copies of the same data can diverge. Unclear which is authoritative.
- Fix approach: Move the bon-iver-ranker into its own separate repository, or delete the root-level duplicates if they are not used by the main app.

**BottomNav links to pages that do not exist:**
- Issue: `components/BottomNav.tsx` defines tabs for `/songs`, `/roster`, `/leaderboard`, and `/analysis`. None of these routes have a corresponding `app/.../page.tsx` in the main app. Only the root `/` route has a `page.tsx`. All four tabs lead to 404s.
- Files: `components/BottomNav.tsx` (lines 11-17)
- Impact: The navigation is non-functional for 4 of 5 tabs in production.
- Fix approach: Either create the missing `app/songs/page.tsx`, `app/roster/page.tsx`, `app/leaderboard/page.tsx`, and `app/analysis/page.tsx` pages, or remove the broken tabs from the nav until they are built.

**Roster lock deadline is disabled:**
- Issue: `app/api/submit-roster/route.ts` line 51 contains `const ROSTER_LOCK_AT: Date | null = null; // new Date("2026-01-10T18:30:00Z");`. The lock is permanently null, so the server never enforces a submission deadline.
- Files: `app/api/submit-roster/route.ts` (line 51)
- Impact: Users can submit or resubmit rosters at any time after the intended deadline. The client-side `locked` state in `RosterBuilder.tsx` is purely cosmetic — a direct API call bypasses it entirely.
- Fix approach: Set `ROSTER_LOCK_AT` to an actual deadline, or move it to an environment variable so it can be configured without a code deploy.

**`edit-roster` route performs no validation:**
- Issue: `app/api/edit-roster/route.ts` accepts any roster payload and upserts it directly to `pool_entries` without validating slot rules, position eligibility, conference constraints, or duplicate players. The `Player` type in this route marks `pos`, `team_id`, and `conference` as optional with a comment: `// edit mode is not validating`.
- Files: `app/api/edit-roster/route.ts` (lines 7-14)
- Impact: Anyone who discovers the edit endpoint can overwrite a valid, validated roster with arbitrary data including wrong positions or duplicate players.
- Fix approach: Extract the `validate()` function from `app/api/submit-roster/route.ts` into `lib/validateRoster.ts` and call it from both routes.

**Multiple redundant import scripts with no canonical version:**
- Issue: The `scripts/` directory contains five nearly-identical Python scripts for importing players from TheSportsDB: `import_pool_players_tsdb.py`, `import_pool_players_tsdb_v1.py`, `import_pool_players_tsdb_v2.py`, `import_pool_players_tsdb_v2_list.py`, plus probe/test scripts. `import_eligible_players_2025.py` is an incomplete stub that immediately raises `SystemExit`.
- Files: `scripts/import_pool_players_tsdb.py`, `scripts/import_pool_players_tsdb_v1.py`, `scripts/import_pool_players_tsdb_v2.py`, `scripts/import_pool_players_tsdb_v2_list.py`, `scripts/import_eligible_players_2025.py`
- Impact: Unclear which script is authoritative. Running an outdated version imports stale player data.
- Fix approach: Delete all but the current working script; add a `scripts/README.md` explaining which to run and why.

**Duplicate PostCSS config files:**
- Issue: Both `postcss.config.js` and `postcss.config.mjs` exist at the project root.
- Files: `postcss.config.js`, `postcss.config.mjs`
- Impact: Ambiguous config resolution; one silently takes precedence. Build behavior is unpredictable.
- Fix approach: Remove `postcss.config.js`, keeping only `postcss.config.mjs` to match the ESM/TypeScript toolchain.

---

## Security Considerations

**No authentication on any API route:**
- Risk: All API routes are fully public. Anyone can POST to `/api/draft-picks` to overwrite all picks for any pool, POST to `/api/edit-roster` to replace any entrant's roster with arbitrary data, or POST to `/api/submit-roster` to submit or overwrite any roster under any name.
- Files: `app/api/draft-picks/route.ts`, `app/api/edit-roster/route.ts`, `app/api/submit-roster/route.ts`, `app/api/rosters/route.ts`
- Current mitigation: None. The `supabaseAdmin` service-role client used in all routes bypasses all Supabase RLS policies by design.
- Recommendations: Add a shared secret header check as a minimum for a private pool (check `Authorization` header against an env var). At minimum, protect all mutating POST routes. Consider Supabase Auth for a more durable solution.

**Unused anon Supabase client exported from `lib/supabase.ts`:**
- Risk: The anon-key client is exported from `lib/supabase.ts` line 4 but never imported anywhere in the main app. If it is ever accidentally used in a `"use client"` component the anon key would be visible in browser network traffic alongside app logic, although the anon key is `NEXT_PUBLIC_` prefixed and designed to be public.
- Files: `lib/supabase.ts` (line 4)
- Current mitigation: It is not currently used client-side.
- Recommendations: Remove the unused export to eliminate accidental usage risk.

**IP address logging without disclosure in bon-iver-ranker:**
- Risk: `bon-iver-ranker/app/api/events/route.ts` logs the client IP address (from `x-forwarded-for`) to the `song_ranker_events` Supabase table on every analytics event.
- Files: `bon-iver-ranker/app/api/events/route.ts` (lines 40-41)
- Current mitigation: Data goes to Supabase only, not a third party.
- Recommendations: Verify this complies with applicable privacy regulations (GDPR etc.) for the user base; document data retention policy.

---

## Performance Bottlenecks

**`/api/players` fetches all players in a single unbounded query:**
- Problem: `app/api/players/route.ts` fetches all rows from `pool_players_curated` for a given `pool_id` with no pagination. For an NFL playoff pool this is hundreds of rows across 14+ teams, all loaded on every mount of `RosterBuilder.tsx`.
- Files: `app/api/players/route.ts`, `components/RosterBuilder.tsx` (lines 141-165)
- Cause: No `limit`/`range` applied to the Supabase query.
- Improvement path: Conference and position filters are already available as query params on the endpoint — use them from the client to fetch only players relevant to the currently open slot. Or add server-side pagination.

**`RosterBuilder.tsx` is a 694-line monolithic client component:**
- Problem: All teams state, all players state, all selection state, the picker modal, the submit form, and the review section are in one component. The `SlotCard` presentational component is defined as an inner function, meaning it is re-created on every render and cannot be memoized.
- Files: `components/RosterBuilder.tsx`
- Cause: Incremental feature additions without refactoring.
- Improvement path: Lift `SlotCard` to a module-level component. Split the picker modal and submit form into separate components. Extract data-fetching into custom hooks.

---

## Fragile Areas

**Draft board entrant names are hardcoded in the UI:**
- Files: `app/page.tsx` (lines 25-34)
- Why fragile: The 8 entrant names (`"Player 1"` through `"Player 8"`) are hardcoded. Changing participants requires a code change and redeploy. Additionally, `normalizePicks` (line 56) bootstraps the pick map from the hardcoded list — entrant names loaded from Supabase that are not in `DEFAULT_ENTRANTS` are technically added to the map but never rendered in the entrant selector `<select>`, making their picks invisible.
- Safe modification: Fetch entrant names from a Supabase config table, or load them from an environment variable as a comma-separated list.
- Test coverage: None.

**Draft pick persistence uses full delete-then-reinsert on every change:**
- Files: `app/api/draft-picks/route.ts` (lines 110-125), `app/page.tsx` (lines 143-163)
- Why fragile: Every single pick addition or removal triggers a POST that deletes ALL picks for the entire pool and then re-inserts them. In a multi-user live draft, two simultaneous changes will race and clobber each other. The window between the DELETE and the INSERT is unprotected at the application level. The database unique constraint on `(pool_id, golfer)` will reject post-race duplicate picks, but the prior valid state is already gone.
- Safe modification: Switch to per-row upsert/delete operations, or use a Supabase RPC stored procedure that handles this atomically.
- Test coverage: None.

**Conference enforcement is conditionally skipped in roster validation:**
- Files: `app/api/submit-roster/route.ts` (lines 81-84)
- Why fragile: The conference check inside `validate()` is guarded by `if (p.conference && p.conference !== slot.conf)`. If any player row in Supabase has a null `conference` field, the check is silently skipped and a wrong-conference player can be submitted into a conference-specific slot.
- Safe modification: Remove the `p.conference &&` guard and always enforce the check, or add a database-level `NOT NULL` constraint on `conference` in `pool_players_curated`.
- Test coverage: None.

---

## Test Coverage Gaps

**Zero tests exist anywhere in the project:**
- What is not tested: All API route handlers, all validation logic in `app/api/submit-roster/route.ts`, the delete-reinsert race condition in `app/api/draft-picks/route.ts`, all client state management in `components/RosterBuilder.tsx` and `app/page.tsx`, the `normalizePicks` utility, and all data transformation in `app/api/leaderboard/route.ts` and `app/api/scoring-breakdown/route.ts`.
- Files: The entire `app/`, `components/`, and `lib/` directories have no corresponding `.test.ts` or `.spec.ts` files.
- Risk: Any regression in validation logic, API behavior, or state management goes undetected. The slot/position/conference/duplicate validation in `submit-roster` is non-trivial and currently relies entirely on manual testing.
- Priority: High — start with unit tests for the `validate()` function in `app/api/submit-roster/route.ts` and the draft-picks POST handler, as these protect data integrity.

---

## Missing Critical Features

**No real-time or concurrency protection for the live draft board:**
- Problem: `app/page.tsx` is designed for 8 entrants drafting simultaneously. There is no WebSocket/realtime subscription, no polling, and no conflict resolution. One user's view goes stale while another picks. The only protection is the database unique constraint on `(pool_id, golfer)` rejecting a duplicate — but the UI shows a generic error and the race-clobbering of the full delete-reinsert means even that protection has a window.
- Blocks: Safe multi-user simultaneous live draft sessions.

**No admin or commissioner interface:**
- Problem: There is no authenticated admin view for managing pool entries, correcting bad submissions, resetting draft boards, or reviewing all rosters. All mutations require direct API calls or direct Supabase dashboard access.
- Blocks: Self-service pool administration without database access.

---

*Concerns audit: 2026-03-04*
