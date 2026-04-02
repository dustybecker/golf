# Entrant Auth Plan

## Goal

Allow each pool participant to draft only for themselves without requiring full
email/password signup.

For this app, the cleanest model is:

- organizer creates one entrant record per participant
- each entrant gets a private access code or invite link
- the user enters that code once
- the server verifies it and sets an HTTP-only session cookie
- all draft writes are enforced server-side against the entrant in that cookie

This removes trust from the browser. The current UI lets any visitor switch the
active entrant and overwrite the whole board. That has to change before the app
is production-safe.

## Recommended Data Model

Run:

- [supabase/entrant_auth_schema.sql](/C:/Users/dusty/playoff-pool-main/supabase/entrant_auth_schema.sql)

New tables:

- `public.draft_entrants`
- `public.draft_sessions`

Existing table updated:

- `public.draft_picks`
  - new nullable `entrant_id`

### `draft_entrants`

This is the authoritative list of who may draft in a pool.

Columns:

- `entrant_id uuid primary key`
- `pool_id text`
- `entrant_name text`
- `entrant_slug text`
- `draft_position integer`
- `access_code_hash text`
- `access_code_hint text`
- `is_admin boolean`

Important rules:

- unique `(pool_id, entrant_name)`
- unique `(pool_id, entrant_slug)`
- store only the access code hash, never the raw code

### `draft_sessions`

This stores active browser sessions after an entrant authenticates.

Columns:

- `session_id uuid primary key`
- `pool_id text`
- `entrant_id uuid`
- `session_token_hash text`
- `expires_at timestamptz`
- `last_seen_at timestamptz`

Important rules:

- cookie token in browser should be opaque/random
- database stores only the hash of that token
- expired sessions should be deleted periodically

### `draft_picks`

`entrant_name` can stay for display compatibility during the transition, but
`entrant_id` should become the write authority.

Long term, draft mutations should use:

- `pool_id`
- `entrant_id`
- `golfer`
- `pick_number`

The browser should no longer submit an arbitrary `entrant_name`.

## Browser Flow

### 1. Entrant access screen

Before showing the draft board, the user sees:

- pool/tournament context
- name selection or invite link
- access code input

Recommended options:

- best UX: invite link containing `entrant_slug`, plus code field
- simplest UX: dropdown of entrant names plus code field

The dropdown is acceptable because the security comes from the private code, not
from hiding entrant names.

### 2. Session creation

Add a route such as:

- `POST /api/auth/entrant-login`

Request:

```json
{
  "pool_id": "2026-majors-masters",
  "entrant_slug": "player-1",
  "access_code": "834912"
}
```

Server behavior:

1. Load the entrant by `pool_id + entrant_slug`
2. Hash the submitted access code
3. Compare to `draft_entrants.access_code_hash`
4. If valid, create a random session token
5. Store its hash in `draft_sessions`
6. Set an HTTP-only cookie, for example `draft_session`

### 3. Session bootstrap

Add:

- `GET /api/auth/me`

Response should include only the authenticated entrant context:

```json
{
  "ok": true,
  "pool_id": "2026-majors-masters",
  "entrant": {
    "entrant_id": "uuid",
    "entrant_name": "Player 1",
    "entrant_slug": "player-1",
    "draft_position": 1,
    "is_admin": false
  }
}
```

The frontend uses this to:

- show the locked-in entrant identity
- disable entrant switching
- optionally show admin controls only for admins

## API Changes Needed

## 1. Stop saving the full board from the browser

Current route:

- [app/api/draft-picks/route.ts](/C:/Users/dusty/playoff-pool-main/app/api/draft-picks/route.ts)

Current problem:

- any browser can submit picks for every entrant
- route trusts `picks_by_entrant`
- route deletes and recreates the entire pool board

This should be replaced with delta-based mutations.

Recommended routes:

- `GET /api/draft-picks?pool_id=...`
  - can still return the full public board
- `POST /api/draft-picks/add`
  - authenticated entrant only
- `POST /api/draft-picks/remove`
  - authenticated entrant only

Suggested add request:

```json
{
  "pool_id": "2026-majors-masters",
  "golfer": "Scottie Scheffler"
}
```

Server-side add flow:

1. Resolve entrant from cookie session
2. Verify session pool matches request pool
3. Count existing picks for that entrant
4. Reject if already at 6 picks
5. Insert next `pick_number`
6. Rely on unique `(pool_id, golfer)` to reject duplicate draft

Suggested remove request:

```json
{
  "pool_id": "2026-majors-masters",
  "golfer": "Scottie Scheffler"
}
```

Server-side remove flow:

1. Resolve entrant from cookie session
2. Delete only rows for that `entrant_id`
3. Resequence that entrant's remaining picks

## 2. Keep reads public for now

For a shared draft board, these routes can remain public:

- `/api/golfers`
- `/api/draft-picks`
- `/api/odds/[tournament]/handicaps`

Only mutation routes need entrant auth immediately.

## 3. Admin-only actions

The following should require `is_admin = true`:

- odds/handicap sync
- draft reset
- future score imports/results sync

That means the sync button currently shown on the draft page should eventually
be hidden for non-admin entrants.

## Cookie Strategy

Recommended cookie:

- name: `draft_session`
- flags:
  - `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax`
  - path `/`

Recommended session lifetime:

- 7 to 14 days

## Why This Is Better Than Local Storage

- browser cannot impersonate another entrant by editing client state
- session token is not readable by client JS
- API authorization is centralized in server routes
- easier to extend later for admin privileges

## Implementation Order

### Phase 1: schema + seed entrants

1. Run `entrant_auth_schema.sql`
2. Create entrant rows for each tournament pool
3. Generate real access codes and hashes

### Phase 2: login/session plumbing

1. Add `/api/auth/entrant-login`
2. Add `/api/auth/me`
3. Add logout route
4. Gate the draft page behind session presence

### Phase 3: lock draft writes

1. Replace full-board save route with add/remove endpoints
2. Resolve authenticated entrant from cookie
3. Use `entrant_id` for writes

### Phase 4: admin controls

1. Mark one or more entrants as admin
2. restrict sync/reset endpoints

## Open Decisions

These need to be finalized before implementation:

1. How entrants receive codes
   - manual text/email from organizer
   - invite link plus code
2. Whether an organizer/admin may draft on behalf of others
3. Whether one shared physical device may be used by multiple entrants during the draft
   - if yes, add a visible logout / switch entrant flow
4. Whether to keep `entrant_name` in `draft_picks` long-term
   - recommended: yes for easier display/auditing, but not as the auth key
