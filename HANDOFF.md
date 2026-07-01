# Handoff

## Branch
`claude/podplay-nextjs-rebuild-izobu1` — pushed, deployed to Vercel, working (login + auth-gated dashboard shell confirmed live).

## Current state
Session 1 (Foundation & Project Setup) complete. Next.js 14 App Router rebuild is live on Vercel with working Supabase auth and a placeholder dashboard shell.

## Completed this session
- Full Next.js 14 + TypeScript + Tailwind + shadcn/ui (hand-written components) rebuild, replacing the vanilla site
- Supabase email/password auth via `@supabase/ssr`, `middleware.ts` route protection for `/dashboard/*`
- Dark sidebar shell with all 4 nav items, mobile drawer, sign-out
- Placeholder pages: Overview (stat cards), Client Hub, HubSpot Onboarding, OPS Guide
- `.env.example` with required keys
- Fixed a Vercel deploy failure (`vercel.json` to override a stale "Output Directory: public" dashboard setting left over from the old static site)
- Diagnosed and resolved a `MIDDLEWARE_INVOCATION_FAILED` 500 caused by missing Supabase env vars on Vercel — confirmed fixed after env vars were added for all environments and redeployed
- Redesigned the login screen (two-panel dark/light layout, icon inputs, loading + error states), verified in-browser at desktop and mobile widths

## Bugs or blockers left open
None currently blocking. Two things worth keeping an eye on, not urgent:
- `@supabase/supabase-js` throws a benign Edge Runtime build warning (`process.version` API) on every build — cosmetic, doesn't fail the build
- Login uses Supabase's newer `sb_publishable_...` anon key format (carried over from the old `app.js`) rather than a JWT-style key — works today, flag if a key-format issue ever comes up

## Next session focus
Session 2 — Client Hub
- Build the client tracker table UI (`app/dashboard/clients/page.tsx`) reading/writing the `locations` table (schema already modeled in `lib/types.ts`)
- Wire the Overview page's stat cards to real Supabase queries (active clients, at-risk, follow-ups due, opened this month)
- Add the `activity_log` write-through on create/update/delete, per `CONTEXT.md`'s "every action is logged" requirement
- Loading + error states for every Supabase query (toast feedback), per `INSTRUCTIONS.md`
