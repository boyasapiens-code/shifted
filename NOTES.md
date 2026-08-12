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
- Stripe webhook endpoints only deliver event TYPES they're explicitly
  subscribed to (`enabled_events`) — adding a new `case` in the webhook route
  handler does nothing until the endpoint's subscription list is also
  updated (via `stripe.webhookEndpoints.update()` or the dashboard). Stripe
  does not retroactively deliver/retry events that occurred before an event
  type was added to the subscription list. Check
  `stripe.webhookEndpoints.list()` → `enabled_events` whenever adding a new
  event type to the handler, and test with a real event, not just a code
  review — this one shipped silently working for the initial charge but
  silently NOT working for the subsequent lifecycle event.
- A DB guard trigger written as `before update` only guards UPDATE — a
  first-time row INSERT never takes that path (even via `.upsert()`, which
  only fires BEFORE UPDATE triggers when a conflicting row already exists),
  so a column-value restriction meant to be absolute needs `before insert or
  update` explicitly, or a separate BEFORE INSERT trigger. Shipped once as
  `before update` only on a paywall guard (employer_profiles_guard_plan) —
  caught by a dedicated post-ship audit before it was exploited, not by
  design. When adding a guard trigger for "column X can only be set by
  service_role," always ask whether a fresh row insert can reach the same
  column, not just an update to an existing row.
- When a "swap/upgrade" action creates a new resource via a payment
  provider (a new Checkout Session, a new subscription, ...), always check
  for an existing live resource of the same kind FIRST — reusing the
  Customer id is not the same as replacing the Subscription; Stripe happily
  creates a second, independent, still-billing subscription on the same
  customer if you don't explicitly check/cancel the old one first. Shipped
  once on `upgradeTo()` (tier-change), reachable via the normal UI "Choose a
  higher tier" button while already subscribed — caught by audit before a
  real customer double-paid, not by design. A one-time "boost" style
  purchase has no such trap (nothing to conflict with); anything with an
  ongoing/recurring resource does.
- After a substantive feature ships (especially anything touching real
  payments), a dedicated adversarial audit of just that feature — not a
  general platform sweep — is worth running before considering it done,
  even after a successful live end-to-end test. A successful test proves
  the happy path works; it doesn't prove the guard can't be bypassed a
  different way, or that a second click doesn't create a second resource.
  Both critical bugs above were found by exactly this kind of dedicated
  review, not by the original end-to-end verification, which passed.
- Vercel's apex→www 308 redirect (shiftedth.com → www.shiftedth.com) used to
  exist ONLY in Vercel's dashboard domain config — completely invisible to
  the repo, undiffable, unreviewable, and the root cause of a real incident
  (Stripe's webhook silently failing at the apex). Any redirect a live
  integration depends on for correctness (not just SEO) belongs in code
  (`next.config.ts`'s `redirects()`), not a platform dashboard — codify it
  the first time it's noticed to matter, don't wait for a migration to force
  the issue.
- Cloudflare Workers has no filesystem at runtime, at ANY point — not just
  "don't call fs at request time," but module-scope code also runs inside
  the Worker isolate on every cold start, not on a build machine. A
  Vercel-style pattern of "read content files with fs, just make sure
  they're bundled" (`outputFileTracingIncludes`) has no Workers equivalent;
  the actual fix is a build-time generation step that runs on a real Node
  process during `next build` and writes the parsed/raw data into an
  imported module — `fs` has to be gone from the request-time code path
  entirely, not just called less.
- Vercel environment variables need a fresh deployment to take effect for
  serverless functions — adding/changing one in the dashboard doesn't
  retroactively apply to the already-built, currently-running deployment.
- When moving content from files to a DB table gated by RLS, the RLS policy
  must encode the exact same "is this visible" rule the app code already
  used — not a rule that merely sounds equivalent. Shipped once: the app's
  real rule for rights articles was `status <> 'draft'` (legal-review
  articles ARE public, just without the full sourcing guardrail), but the
  new policy was written as `status = 'published'` — stricter than the app,
  so RLS silently zeroed every query before the app's own `!== 'draft'`
  filter ever ran. Caught immediately via local preview (empty rights hub)
  before it reached production — always load-test a new RLS policy against
  the real, currently-in-use status/flag values, not just against a
  hand-picked "published" row.
- Next.js `generateStaticParams()` (and other build-time-only functions)
  run with NO request scope at all — calling the cookie-aware Supabase
  server client (`next/headers`' `cookies()` under the hood) from inside one
  throws "cookies was called outside a request scope," even though the same
  function works fine when called from a page body. Any data-fetching
  function that might be called from `generateStaticParams` needs a
  cookie-free client — added `lib/supabase/public.ts` (plain anon-key
  client, no SSR cookie plumbing) for read paths that are genuinely public
  and don't need per-user session context.
