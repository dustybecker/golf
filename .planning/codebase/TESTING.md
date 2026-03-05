# Testing

**Analysis Date:** 2026-03-04

## Current State

**No tests exist.** Zero test files anywhere in the project. No test framework is configured.

- No `test` script in `package.json`
- No Jest, Vitest, Playwright, Cypress, or any other test framework installed
- No `__tests__/`, `*.test.ts`, or `*.spec.ts` files
- The `scripts/` Python files are ad-hoc data import utilities, not automated tests

## Framework

**Recommended:** Vitest (aligns with Next.js ecosystem, fast, built-in TypeScript support)

**Not configured** — would need to add:
- `vitest` dev dependency
- `@vitejs/plugin-react` for component tests
- `vitest.config.ts`
- `test` script in `package.json`

## Test Structure (Recommended)

```
__tests__/
├── api/                    # API route handler unit tests
│   ├── submit-roster.test.ts
│   ├── draft-picks.test.ts
│   └── leaderboard.test.ts
├── components/             # Component tests
│   └── RosterBuilder.test.tsx
└── lib/                    # Utility tests
    └── supabase.test.ts
```

## High-Value Test Targets

### 1. `app/api/submit-roster/route.ts` — `validate()` function
Business logic for roster validation: slot positions, conference constraints, no duplicates.
This is pure logic with no side effects — easiest to unit test.

### 2. `app/page.tsx` — `normalizePicks()` / `createInitialPicks()`
Data transformation functions that normalize API response into local state shape.

### 3. `components/RosterBuilder.tsx` — slot assignment logic
`SLOTS` array, `SlotId` type, player-to-slot assignment, conference enforcement.

### 4. API routes — Supabase mock pattern
All API routes use `supabaseAdmin` from `lib/supabase.ts`.
Mock pattern: `vi.mock('../../../lib/supabase', () => ({ supabaseAdmin: mockClient }))`.

## Mocking Patterns (Recommended)

```typescript
// Mock Supabase admin client
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      data: [],
      error: null,
    }),
  },
}))
```

## Coverage Gaps

| Area | Risk | Notes |
|------|------|-------|
| Roster validation logic | High | Business rules not tested; silent bugs possible |
| Draft picks replace strategy | High | Delete-all-then-reinsert; partial failure not tested |
| Conference constraint enforcement | Medium | Soft check that silently skips when `conference` is null |
| Optimistic update rollback | Medium | Race condition behavior untested |
| Leaderboard aggregation | Low | Read-only query, lower risk |

---

*Testing analysis: 2026-03-04*
