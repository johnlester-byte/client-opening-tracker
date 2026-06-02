# Client Opening Tracker

A lightweight static website for tracking client location opening dates, who's tracking each one, and follow-up reminders sent automatically via Slack 3 days before and 3 days after each opening.

## What's here

- `index.html` — the website UI (view, add, edit, delete locations; export updated data)
- `locations.json` — the text database all data lives in
- `README.md` — this file

## How it works

The site loads `locations.json` and renders a dashboard with stats, filters, and a table. Each location tracks: name, opening date, tracker, status, notes, and whether the pre-open and post-open follow-ups are done. Rows automatically flag when a follow-up is due (within 3 days before, or 3+ days after opening).

### Editing data

Edits happen in your browser (in memory). When finished:

1. Click **Export locations.json** — downloads the updated file.
2. Commit/replace `locations.json` in this repo on GitHub.

This keeps a single shared source of truth that the whole team sees.

## Hosting on GitHub Pages

1. Push this folder to a GitHub repo.
2. In the repo: **Settings → Pages → Source: `main` branch, `/root`**.
3. Your site goes live at `https://<username>.github.io/<repo>/`.

## Slack reminders

A scheduled task runs daily, reads `locations.json` from this repo, and posts Slack reminders:

- **3 days before opening** — prompts the tracker/team to check on anything that needs changing.
- **3 days after opening** — asks how the opening went and whether any problems came up.

Reminders only fire while the follow-up is still marked incomplete. Mark them done in the UI (and export) to stop them.
