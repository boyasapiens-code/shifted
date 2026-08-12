# SHIFTED — Notes

Reusable facts learned the hard way. One line each; append, don't restructure.

- `npm run typecheck` does NOT run ESLint — `npm run build` does. A commit can
  pass typecheck and still fail Vercel's build (e.g. `react/no-unescaped-entities`
  on raw apostrophes in JSX). Always run a full `npm run build` before pushing,
  not just typecheck.
- `next lint` (and `npm run lint`) only scans `pages/app/components/lib/src` by
  default — files under `scripts/` are never linted that way. Latent issues
  there won't surface via `npm run lint` or `npm run build`; use
  `npx eslint .` for a true full-repo sweep.
- `git reset --hard origin/main` discards ALL uncommitted local changes, not
  just a specific test commit — it wiped a real package.json edit once. Use
  `git stash` or `git reset --soft HEAD~1` when cleaning up a throwaway test
  commit and you have other uncommitted work you want to keep.
- Spawning a background task/session into an isolated git worktree: don't
  hardcode the main repo's absolute path in the task prompt — the spawned
  agent will happily use that exact path and edit the main repo's working
  tree directly instead of its own worktree, leaving the worktree empty and
  the "isolation" meaningless.
- Local dev servers on port 3000 often collide with another session's dev
  server. `.claude/launch.json`'s "Next.js dev server" config already has
  `"autoPort": true` — if it's ever missing, add it (and confirm no `--port`
  flag is hardcoded in the `dev` script) rather than trying to kill another
  session's server.
- `test:trust-circle` needs a live `SUPABASE_SERVICE_ROLE_KEY` DB connection —
  can't run inside Vercel's or GitHub Actions' build sandbox (no such secret
  configured there, deliberately). Gated via a local pre-push hook instead of
  CI to avoid putting that credential into third-party CI infra at this stage.
- Node 20 needs a WebSocket polyfill before importing `@supabase/supabase-js`
  in standalone scripts: `if (!globalThis.WebSocket) { const { default: WebSocket } = await import("ws"); globalThis.WebSocket = WebSocket; }`.
- Vercel deploys and GitHub Actions CI are fully independent consumers of the
  same push webhook — neither gates the other. A failed CI run does not stop
  a Vercel deploy, and vice versa.
