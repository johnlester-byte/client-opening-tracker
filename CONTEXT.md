# PodPlay CS Unified Dashboard

Internal command center for the PodPlay Customer Success team. Replaces scattered tools (vanilla tracker, Notion docs, Slack threads) with a single unified dashboard.

## Who uses it
PodPlay CS agents (CSAs) and their lead. Late-shift and early-shift handoffs happen through this tool.

## What it does
- **Client Hub** — tracks client location opening dates, status, follow-ups, and CSA ownership
- **HubSpot Onboarding Panel** — surfaces HubSpot onboarding deals and contact details without leaving the dashboard
- **OPS Troubleshooting Guide** — searchable internal knowledge base for common CS issues and escalation paths
- **Activity Log** — every action is logged with who did it and when

## Stack
- Next.js 14 App Router (TypeScript)
- Supabase (Postgres + Auth + Realtime)
- Tailwind CSS + shadcn/ui
- Hosted on Vercel, versioned on GitHub

## Repo
https://github.com/rhennnnnn/podplay-cs-unified-dashboard

## Key constraints
- Auth required — Supabase email/password, accounts created by admin only
- All secrets via environment variables, never committed
- Feature branches per session, merge to main only when working end-to-end
- Admin controls visible only to @podplay.app email accounts
