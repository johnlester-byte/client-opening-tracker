# Project Documentation

Append-only. Each session adds a new section. Never overwrite existing entries.

---

_No sessions documented yet. First entry will appear after Session 0._

---

## Session 1 — Foundation & Project Setup
**Date:** 2026-07-01

### What was built
- Replaced the vanilla HTML/JS/CSS static site with a Next.js 14 App Router + TypeScript project
- Tailwind CSS configured with the shadcn/ui "new-york/zinc" theme (CSS variables, dark mode via `next-themes`)
- shadcn/ui components hand-written (button, input, label, card, sheet, dropdown-menu, separator, skeleton, sonner) — the shadcn CLI's registry (`ui.shadcn.com`) was unreachable from this environment's network proxy, so component source was written directly instead of fetched
- Supabase email/password auth via `@supabase/ssr` (server + browser clients), with `middleware.ts` protecting all `/dashboard/*` routes and redirecting signed-out users to `/login`
- Dark sidebar shell (`#0f1117`) with Overview, Client Hub, HubSpot Onboarding, and OPS Guide nav items, user email + sign-out, mobile sheet drawer
- Placeholder pages for Overview (stat-card shells), Client Hub, HubSpot Onboarding, OPS Guide
- `.env.example` with the four required keys; `.env.local` never committed
- Redesigned the login screen: two-panel layout (dark brand panel + form panel with icon-prefixed inputs, loading spinner, styled error alert), collapsing to one column on mobile
- Added root `vercel.json` to fix a Vercel deployment failure (see Known issues)

### Key files created or modified
- `app/layout.tsx`, `app/page.tsx` (root redirect to `/dashboard`)
- `app/(auth)/login/page.tsx` + `components/login-form.tsx`
- `app/dashboard/layout.tsx` (sidebar shell, server-side auth check) + `components/dashboard-sidebar.tsx`
- `app/dashboard/page.tsx`, `app/dashboard/clients/page.tsx`, `app/dashboard/onboarding/page.tsx`, `app/dashboard/ops-guide/page.tsx`
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/types.ts`, `lib/utils.ts`
- `middleware.ts`
- `components/ui/*` (button, card, input, label, dropdown-menu, separator, sheet, skeleton, sonner)
- `components/theme-provider.tsx`
- `tailwind.config.ts`, `app/globals.css`, `components.json`
- `.env.example`, `vercel.json`
- Removed: `index.html`, `app.js`, `styles.css`, `readiness.html`, `locations.json`, `assets/`, `docs/*.sql` (old vanilla site — the SQL files' schema was ported into `lib/types.ts` before deletion)

### Supabase schema changes
None made directly — no migrations run this session. `lib/types.ts` models the existing schema found in the old repo's `docs/database-setup.sql` and `docs/upgrade-auth-activity.sql` (now removed from the tree, still in git history): `locations`, `activity_log`, and `readiness` tables. The Client Hub page still needs to be wired up to actually query these.

### Known issues / edge cases discovered
- **Vercel "Output Directory: public" mismatch:** the Vercel project was originally configured for the old static site with a manual Output Directory override. Every Next.js build failed post-compile with `No Output Directory named "public" found` even though `next build` succeeded. Fixed by committing a root `vercel.json` (`framework: nextjs`, `outputDirectory: .next`) — this must stay in the repo.
- **Missing env vars crash middleware, not just pages:** because `middleware.ts` runs on every request and calls `createServerClient()` unconditionally, missing/misconfigured `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel causes a hard 500 (`MIDDLEWARE_INVOCATION_FAILED`) site-wide, not a graceful in-app error. Confirmed fixed once real env vars were set in Vercel for all environments and redeployed.
- Supabase's newer "publishable key" format (`sb_publishable_...`) was used for `NEXT_PUBLIC_SUPABASE_ANON_KEY` (carried over from the old `app.js`) rather than the legacy JWT-style anon key — worked fine with the installed `@supabase/ssr`/`supabase-js` versions, but worth knowing if a key-format issue ever resurfaces.
- Overview page stat cards are still hardcoded placeholders (`—`) — expected at this stage, not a bug. Client Hub isn't wired to the `locations` table yet.
- Edge Runtime build warning from `@supabase/supabase-js` (`process.version` used, not supported in Edge Runtime) appears on every build — benign per Supabase's own `@supabase/ssr` docs, does not affect middleware behavior, but shows up in build logs every time.

---
