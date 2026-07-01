# Session Instructions

Follow these rules for every Claude Code session on this project.

## Start of session
Read CONTEXT.md, DOCUMENTATION.md, INSTRUCTIONS.md, and HANDOFF.md before writing any code.

## Communication style
- Use caveman mode for all responses — compressed, no filler, direct
- Lead with what you're doing, not why
- Bullet points over paragraphs

## UI/UX
- Use ui-ux-pro-max standards for all UI decisions
- Components: shadcn/ui only — no raw HTML form elements or ad-hoc styled divs
- Dark sidebar (#0f1117), white/light content area
- Every interactive element must have a loading state and error state
- Mobile-responsive by default

## Plugins and connectors
- Use all available MCP connectors (Linear, Slack, HubSpot, Supabase, GitHub)
- If a task can be done via connector instead of manual code, use the connector
- Check available tools before writing custom fetch logic

## Code quality
- TypeScript strict mode — no `any`, no implicit returns
- All Supabase queries wrapped in try/catch with toast error feedback
- All API routes must return typed responses
- No console.log left in production code — use proper error boundaries

## Debugging
- Before marking any feature complete: open the browser, click through the full flow, check console for errors
- Run `next build` locally before pushing — fix all TypeScript and build errors first
- Test auth flow: sign in, navigate to protected route, sign out, confirm redirect

## Vercel deployment
- App Router only — no /pages directory
- No experimental Next.js flags
- `next.config.ts` stays minimal
- External image domains go in `images.remotePatterns`, not `domains`
- Never commit .env files — all secrets in Vercel Environment Variables
- Commit a root `vercel.json` with `"framework": "nextjs"`, `"buildCommand": "next build"`, `"outputDirectory": ".next"` — this repo's Vercel project was originally configured for the old static site with a manual "Output Directory: public" override in the dashboard, which fails every Next.js build ("No Output Directory named public found"). `vercel.json` in the repo overrides that stale dashboard setting, so never remove it or let it drift
- If a Vercel build ever fails with a missing-output-directory error, check `vercel.json` is present and correct before touching anything else

## GitHub versioning
- One feature branch per session: `feat/foundation`, `feat/client-hub`, `feat/hubspot`, `feat/ops-guide`
- Never commit to main directly
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Commit after each logical unit — don't bundle everything into one commit at the end
- SQL migration files must be committed alongside the code that needs them

## End of session
When user says "populate documentation.md":
- Append this session's summary to DOCUMENTATION.md (never overwrite)
- Overwrite HANDOFF.md with next-session context
- Commit and push
