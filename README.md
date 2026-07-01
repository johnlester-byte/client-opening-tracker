# PodPlay CS Unified Dashboard

Internal command center for the PodPlay Customer Success team — a Next.js 14 App Router rebuild replacing the previous vanilla HTML/JS tracker.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth) via `@supabase/ssr`
- next-themes for dark mode

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + HubSpot keys
npm run dev
```

## Project structure

```
app/
  (auth)/login/page.tsx        login screen
  dashboard/layout.tsx         sidebar shell (auth-gated)
  dashboard/page.tsx           overview / summary stats
  dashboard/clients/page.tsx   Client Hub
  dashboard/onboarding/page.tsx HubSpot Onboarding panel
  dashboard/ops-guide/page.tsx  OPS troubleshooting guide
lib/
  supabase/server.ts           server-side Supabase client
  supabase/client.ts           browser Supabase client
  types.ts                     TypeScript types for DB tables
middleware.ts                  session refresh + route protection
```

## Auth

Email/password via Supabase, session stored in cookies. `middleware.ts` protects every `/dashboard` route and redirects signed-out users to `/login`. Accounts are created by an admin in the Supabase dashboard — public sign-up is disabled.

## Database

See `docs/database-setup.sql` and `docs/upgrade-auth-activity.sql` (in project history) for the `locations` and `activity_log` table definitions this dashboard reads from.
