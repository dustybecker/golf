# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- React page components: `page.tsx` (Next.js App Router convention)
- React components: PascalCase — `RosterBuilder.tsx`, `BottomNav.tsx`
- API routes: `route.ts` inside `app/api/[endpoint]/` directories
- Library/utility files: camelCase — `supabase.ts`, `playoffData.ts`, `songs.ts`

**Functions:**
- React component functions: PascalCase exports — `export default function DraftPage()`, `export default function RosterBuilder()`
- Helper/utility functions: camelCase — `createInitialPicks()`, `normalizePicks()`, `normalizeName()`, `pillClass()`, `slotTitle()`
- Async event handlers: camelCase verbs — `loadGolfers()`, `loadPicks()`, `persistPicks()`, `addPick()`, `removePick()`, `clearDraftBoard()`
- Validation functions: camelCase — `validate(payload)`
- Sub-components defined inside parent: PascalCase — `const SlotCard = ({ slot }: { slot: SlotDef }) => ...`

**Variables:**
- State variables: camelCase noun or nounVerb pattern — `golfers`, `loadingGolfers`, `golfersError`, `picksByEntrant`, `savingPicks`
- Boolean state naming: `loading*` prefix for loading states, `*Error` suffix for error states
- Derived booleans: `activeIsFull`, `canReview`, `canLock`, `canSubmit`, `isFilled`, `isActive`
- Constants: UPPER_SNAKE_CASE — `MAX_PICKS_PER_ENTRANT`, `FALLBACK_GOLFERS`, `DEFAULT_ENTRANTS`, `TOURNAMENTS`, `SLOTS`, `ROSTER_LOCK_AT`

**Types:**
- All types: PascalCase — `Golfer`, `DraftPickRow`, `Player`, `Team`, `SlotDef`, `Payload`
- Union string literal types: uppercase string literals — `"AFC" | "NFC"`, `"QB" | "RB" | "WR" | "TE"`
- Template literal types used for compound IDs — `type SlotId = \`${Conference}_${SlotBase}\``
- Status union types: `"idle" | "submitting" | "success" | "error"`
- Types defined local to the file that uses them (not in shared type files)

## Code Style

**Formatting:**
- No Prettier config detected; formatting is manually consistent
- 2-space indentation throughout TypeScript/TSX files
- Trailing commas in multi-line arrays and objects
- Double quotes for JSX attributes, double quotes for TypeScript strings
- Semicolons used throughout

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config at `eslint.config.mjs`
- No additional custom rules beyond Next.js recommended set

**TypeScript:**
- `strict: true` enabled in `tsconfig.json`
- Target: ES2017
- `@/*` path alias mapped to project root (e.g., `import { supabaseAdmin } from "@/lib/supabase"`)
- Explicit type annotations on function parameters when complex
- `type` keyword preferred over `interface` for object shapes

## Import Organization

**Order (observed pattern):**
1. React/Next.js framework imports — `"use client"` directive at top, then `import { useEffect, useMemo, useState } from "react"`
2. Next.js specific imports — `import { NextResponse } from "next/server"`, `import Link from "next/link"`
3. Internal library imports — `import { supabaseAdmin } from "@/lib/supabase"`
4. No third-party library imports beyond React/Next/Supabase

**Path Aliases:**
- `@/*` resolves to project root — used in API routes to import from `@/lib/supabase`
- Relative imports only used for CSS — `import "./globals.css"`

## Error Handling

**Client-side pattern (React components):**
- Error state variable per data source: `const [golfersError, setGolfersError] = useState<string | null>(null)`
- `try/catch/finally` blocks in async data loader functions inside `useEffect`
- `catch (e: any)` with fallback: `e?.message ?? "Fallback message"`
- Optimistic UI updates with rollback on error (in `addPick`, `removePick`, `clearDraftBoard`):
  ```typescript
  setPicksByEntrant(next);   // optimistic
  try {
    await persistPicks(next);
  } catch {
    setPicksByEntrant(picksByEntrant); // rollback
  }
  ```
- Cancellation guards for async effects: `let cancelled = false` with cleanup `return () => { cancelled = true; }`

**API route pattern:**
- JSON parse errors caught with empty `catch {}`:
  ```typescript
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  ```
- Supabase errors checked via destructured `error` property and returned as 500:
  ```typescript
  const { data, error } = await supabaseAdmin.from(...)...;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  ```
- Validation errors returned as 400 with specific messages
- Success responses always include `ok: true` and relevant identifiers

**Response shape convention:**
- Success: `{ ok: true, poolId, <data key>: ... }`
- Error: `{ error: "message string" }` (optionally `{ error: "...", errors: string[] }` for multi-error validation)

## Logging

**Framework:** None — no logging library present

**Patterns:**
- No `console.log` or `console.error` calls found in source files
- Errors surfaced to users via state variables rendered in JSX, not logged to console

## Comments

**When to Comment:**
- Inline comments for non-obvious decisions: `// Optional: set a lock deadline (server-side enforcement)`
- Section separators using `{/* Comment */}` JSX syntax to label UI regions
- One-line comments for clarifying intent on defensive checks: `// Defensive checks (should already be filtered)`
- Commented-out code left in place with notes: `// updated_at: new Date().toISOString(),`

**JSDoc/TSDoc:**
- Not used — no JSDoc annotations present in codebase

## Function Design

**Size:** Functions tend to be medium-length; data loader functions within `useEffect` are typically 10-20 lines

**Parameters:** Simple parameter shapes; complex data passed as typed objects

**Return Values:**
- API routes always return `NextResponse.json(...)` — never throws
- Helper functions return plain values (strings, arrays, objects)
- Validation function returns `{ ok: boolean, errors: string[], entrantName: string }` shape

## Module Design

**Exports:**
- One default export per file — the main component or the primary function/constant set
- Named exports used in `lib/playoffData.ts` for type and data exports
- API routes export named async functions (`GET`, `POST`) per Next.js App Router convention

**Barrel Files:**
- None — no `index.ts` re-export files; imports reference files directly

## Tailwind CSS Conventions

**Theme tokens used throughout (defined in `tailwind.config.js`):**
- `bg-bg` — page background (`#0F172A`)
- `bg-surface` — card/panel background (`#111827`)
- `border-border` — standard border (`#1F2937`)
- `bg-accent` / `text-accent` — primary action color, green (`#22C55E`)
- `text-text` — primary text (`#E5E7EB`)
- `text-muted` — secondary/label text (`#9CA3AF`)
- `text-danger` / `border-danger` — error state (`#EF4444`)

**Class composition pattern:**
```typescript
className={[
  "base classes here",
  condition ? "active classes" : "inactive classes",
].join(" ")}
```

**Layout approach:** Tailwind utility classes only — no CSS modules, no styled-components, no custom CSS beyond `globals.css` base reset

---

*Convention analysis: 2026-03-04*
