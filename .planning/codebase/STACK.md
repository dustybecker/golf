# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- TypeScript 5.x - All frontend and API route code in `app/`, `lib/`, `components/`

**Secondary:**
- Python 3.x - Data import/admin scripts in `scripts/`
- JavaScript - Config files (`tailwind.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js v24.x (detected on dev machine; no `.nvmrc` lockfile present)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework; App Router with `app/` directory; API routes under `app/api/`
- React 19.2.3 - UI rendering; uses `"use client"` directive for client components

**Build/Dev:**
- Next.js dev server with webpack flag (`next dev --webpack`), indicating webpack is explicitly chosen over Turbopack
- TypeScript compilation via Next.js built-in pipeline (no separate tsc step in scripts)

**Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS; custom design tokens defined in `tailwind.config.js`
- PostCSS 8.5.x - CSS processing with `@tailwindcss/postcss` plugin
- Custom color palette: `bg`, `surface`, `border`, `accent`, `info`, `text`, `muted`, `danger` tokens

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.90.1 - Database client; two instances (anon + service role) in `lib/supabase.ts`
- `next` 16.1.1 - Core framework (pinned to exact version in devDependencies ESLint config)
- `react` 19.2.3 - UI layer

**Infrastructure:**
- `@tailwindcss/postcss` ^4 - PostCSS plugin bridging Tailwind v3 config with PostCSS pipeline
- `autoprefixer` ^10.4.23 - CSS vendor prefix injection

**Python Scripts (not in package.json):**
- `supabase` Python SDK - Used in import scripts for direct database writes
- `requests` - HTTP client for TheSportsDB API calls
- `python-dotenv` - Environment variable loading for scripts
- `nflreadpy` - NFL snap count data (exploration only, not production)

## Configuration

**Environment:**
- No `.env` file committed; environment variables are expected at runtime
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional vars: `NEXT_PUBLIC_POOL_ID` (client-side pool selector, defaults to `"2026-majors"`), `POOL_ID` (server-side, defaults vary by route)
- Python scripts also require: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `THESPORTSDB_API_KEY`, `POOL_ID`, `TSDB_LEAGUE_ID`

**TypeScript:**
- Config: `tsconfig.json`
- Strict mode enabled
- Path alias `@/*` maps to project root (`./`)
- Target: ES2017; module resolution: `bundler`

**Build:**
- `next.config.ts` - Minimal Next.js config (no special options set)
- `tailwind.config.js` - Content paths include `app/`, `components/`, `pages/`
- `postcss.config.mjs` - Uses `@tailwindcss/postcss` plugin only
- `eslint.config.mjs` - Flat config using `eslint-config-next` core-web-vitals and TypeScript presets

## Platform Requirements

**Development:**
- Node.js 24.x
- npm
- Supabase project with `NEXT_PUBLIC_SUPABASE_URL` and keys configured

**Production:**
- Deployment target: Not explicitly configured; Next.js default (Vercel-compatible, any Node host)
- `next build` + `next start` for production run

---

*Stack analysis: 2026-03-04*
