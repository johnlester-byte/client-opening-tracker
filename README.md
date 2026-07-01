# Client Opening Tracker

A live website for tracking client location opening dates, who's tracking each one, and follow-up reminders sent automatically via Slack 3 days before and 3 days after each opening.

## Project structure

```
/ (repo root)
├── index.html              the tracker (must stay at root for GitHub Pages)
├── readiness.html          client-facing "Open Readiness" checklist (no login)
├── README.md               this file
├── assets/
│   └── favicon.ico         browser tab icon (and any future images)
└── docs/
    ├── database-setup.sql  Supabase `locations` table + security setup
    ├── upgrade-auth-activity.sql  adds real logins + activity log
    └── readiness-setup.sql adds the `readiness` table behind readiness.html
```

Data is stored in a live Supabase database, so the whole team sees the same data in real time.

## How it works

The site connects to a **Supabase** database (free tier). Anyone with the link can view the tracker. To add or edit, click **Unlock editing** and enter the shared team password. Changes save instantly to the database and update live on everyone's screen.

Each location tracks: name, opening date, tracker, status, notes, and whether the pre-open and post-open follow-ups are done. Rows automatically flag when a follow-up is due (within 3 days before opening, or 3+ days after).

## Logins (Supabase Auth)

The site requires a real login. Data is readable and editable only by accounts you create in Supabase, so there is no longer a shared password.

To add a teammate: Supabase dashboard → Authentication → Users → Add user (email + password, tick "Auto Confirm User"). Public sign-up is turned off, so only accounts you create can log in. To remove someone's access, delete their user there.

## Features

- Active Queue / Opened / Activity Log tabs.
- Opened workflow: marking a client "Opened" records the actual open date and a "how it went" note.
- Activity Log: every add/edit/delete/opened is recorded with who did it and when.
- Export CSV: downloads the rows currently shown (respects tab + filters).

## Hosting on GitHub Pages

1. Push this folder to a GitHub repo (public).
2. Repo **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
3. The site goes live at `https://<username>.github.io/<repo>/`.

## Database

- Hosted on Supabase, table `locations`.
- You can also view/edit rows directly in the Supabase dashboard (Table Editor) — handy as a spreadsheet-style backup.
- The publishable (anon) key in `index.html` is public-safe by design; data is protected by the row-level-security policies and the shared editing password.

## Client Readiness checklist (`readiness.html`)

Each client gets their own private link to the "Open Readiness" checklist — the same gated pre-opening checklist (hardware, install, software, staff training, soft-opening testing, sign-off) that used to be a standalone file you'd email around. Now it's wired into the same Supabase project as the tracker, so:

- The client fills it out themselves, on their own time, no login required.
- Their answers save to the database as they go (not just their browser) — nothing is lost if they switch devices or clear their cache.
- Your team sees live progress right in the tracker: a **Readiness** column shows each client's % complete, with a **Copy link** button to (re)send their link.

**One-time setup:** run `docs/readiness-setup.sql` in the Supabase SQL Editor. It creates the `readiness` table, backfills a link for every existing client, and sets up the security so a client's link can only ever read or write that one client's row — never anyone else's. New clients added afterward get a link automatically.

**How the security works:** the client's link looks like `readiness.html?token=<uuid>`. That token is a random id, unrelated to the client's row id in the tracker, so it can't be guessed. The page never talks to the database directly — it calls two database functions (`get_readiness` / `save_readiness`) that only ever touch the single row matching that token. Nothing about this exposes any other client's data, and no client account or password is ever created.

## Slack reminders

A scheduled task runs daily, reads the locations from Supabase, and DMs each tracker on Slack:

- **3 days before opening** — check whether anything still needs changing or checking.
- **3 days after opening** — ask how the opening went and whether any problems came up.

Reminders only fire while the relevant follow-up is still unchecked. Mark it done in the site to stop them. Make sure tracker names match their Slack profile names so they can be matched.
