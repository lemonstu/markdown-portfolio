# Weekly Organic Growth Brief — SaaS app (Phase 1)

> **Not another SEO dashboard.** A weekly action list showing exactly what to fix, update, and prioritize based on GA4 + Google Search Console data.

This folder is the SaaS implementation that complements the marketing site (`../landing-page/`) and the static sample report (`../sample-report/`). It is **Phase 1 only**: it proves the full product loop end-to-end on demo data, but it does not yet connect to real Google Search Console, GA4, Stripe, or email. Honest placeholders mark every Phase 2+ surface.

---

## What works today (Phase 1)

- **Auth.** Supabase email + password sign-up / sign-in / sign-out / forgot-password / reset-password. Session refresh handled in middleware. Protected app routes.
- **Workspaces (organizations).** A signed-up user creates a workspace during onboarding. Roles modeled: `owner`, `admin`, `member`, `viewer`.
- **Sites.** Each workspace can hold multiple sites. Each site has a goal, status, timezone, and integration mode (`demo`, `pending_google_connection`, `connected`).
- **Demo data.** A SQL seed populates one realistic site (`mountainjournal.example.com`) with GSC page metrics, query metrics, page-query metrics, and GA4 landing-page metrics covering the current week and the prior week. Tuned to trigger every detector at least once.
- **Deterministic analysis engine.** 8 detectors, no LLM, every finding traceable to the metric rows that produced it:
  1. Pages losing clicks
  2. Rising impressions / weak CTR
  3. Near-win keywords (positions 4–20)
  4. Content decay
  5. GA4 engagement / conversion mismatch
  6. Cannibalization risk
  7. Internal-link opportunities
  8. Previous action follow-up
- **Explainable priority scoring.** Each finding gets a 0–100 `priority_score`, a P1/P2/P3 bucket, and a one-sentence `score_explanation` naming the dominant factor.
- **Findings UI.** List with filters (site / type / priority / status / confidence), accept / dismiss / complete, convert to action item.
- **Action items.** Created from findings, status tracked (open / in progress / completed / dismissed), inline notes.
- **Reports.** A "Weekly Organic Growth Brief" generator that assembles all 13 spec sections from findings. View in-app, copy executive summary, copy agency email, download Markdown, print to PDF via the browser.
- **Dashboard.** Active sites, latest reports, urgent P1 findings, growth opportunities, open vs completed actions, pending integrations, recent runs.
- **Print-friendly report.** `/app/reports/[id]/print` renders the brief on white background with all CTAs hidden. `Ctrl/Cmd + P` produces a clean PDF.

## What is intentionally not built (Phase 2+)

| Feature | Status | Phase |
|---|---|---|
| Real Google OAuth | Honest placeholder on `/app/integrations` | Phase 2 |
| GSC API sync | Not implemented | Phase 2 |
| GA4 API sync | Not implemented | Phase 2 |
| Token refresh | Not implemented | Phase 2 |
| Email delivery | Honest placeholder | Phase 3 |
| Scheduled weekly briefs | Honest placeholder | Phase 3 |
| Stripe billing / checkout / customer portal | Honest placeholder on `/app/billing` (no checkout button) | Phase 4 |
| Plan limits enforcement | Not implemented | Phase 4 |
| Team invitations | Note on `/app/settings` | Phase 5 |
| White-label branding | Not implemented | Phase 5 |
| PDF rendering server-side | Not implemented — use browser print for now | Phase 5 |

Each placeholder page tells the user explicitly what is and isn't wired up. There are no fake checkout buttons, fake OAuth flows, or fake data-sync animations.

---

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS v4 (CSS-first `@theme inline` tokens, matches the sample report's palette)
- Supabase Auth + Postgres + Row Level Security (`@supabase/ssr` for cookie-based sessions)
- `zod` for input validation
- `clsx` + `tailwind-merge` for className composition
- No charting library yet (Phase 1 report is tables + cards; add Recharts in Phase 2 if needed)
- No icon library — inline SVG matches the rest of the brand

---

## Required environment variables

Copy `.env.example` → `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # production: your real domain, no trailing slash
```

No service-role key is used in Phase 1. All database access goes through the user's session and is constrained by RLS.

---

## Supabase setup (one-time)

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Settings → API:** copy the project URL and `anon` public key into `.env.local`.
3. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000` (or your prod URL)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `http://localhost:3000/reset-password`
4. **Authentication → Providers → Email:** make sure email auth is enabled.
   For local dev you may also want to **disable "Confirm email"** so you can sign up and sign in without a real inbox; re-enable for production.
5. **Run the migration.** Open the SQL editor in your Supabase dashboard, paste the contents of `supabase/migrations/0001_init.sql`, and run.
6. **Sign up at least one user** in the running app (`/sign-up`).
7. **Seed demo data.** Back in the SQL editor, paste `supabase/seed.sql` and run. It picks up the most recently created auth user and grants them a demo workspace with a fully populated demo site.

---

## Run locally

```bash
cd saas-app
pnpm install     # or npm install / yarn
pnpm dev         # http://localhost:3000
```

Then:

1. Open `http://localhost:3000` — you'll be redirected to `/sign-in`.
2. Click **Create account** and sign up.
3. If "Confirm email" is enabled in Supabase, click the link in the email.
4. You'll land on `/onboarding`. Create a workspace.
5. Add a site (any URL works for Phase 1 — it's demo-mode only).
6. Run `supabase/seed.sql` in the Supabase SQL editor — this attaches realistic demo metrics to your most-recent site/workspace.
7. Go to **Sites → click your site → Run demo analysis**. Findings will populate.
8. Click **Generate brief**. You're taken to `/app/reports/[id]` with the full Weekly Organic Growth Brief.
9. Try the **Copy summary**, **Copy email summary**, **Download .md**, and **Print view** buttons.
10. Convert a finding to an action from the **Findings** page, then complete it from **Actions**.

### Re-running the seed

`supabase/seed.sql` creates a *new* org + site every run. To start fresh, drop the old rows or just sign up as a new user.

---

## Demo-mode contract

Demo mode is not a code branch — it's a label on the integration mode of a site. Detectors read the same metric tables they will read when Phase 2 ships real Google sync. This means:

- The demo data and the production data follow the same schema.
- The same detector logic runs identically against either.
- The UI shows a clear `Demo` badge anywhere a demo site appears.
- Reports include `Brief built from demo data` in the footer when the source site is demo-mode.

When Phase 2 lands, real GSC/GA4 syncs write to the same `gsc_*` and `ga4_*` tables — and the detectors require no change.

---

## Folder layout

```
saas-app/
├── app/
│   ├── (auth)/             # sign-in, sign-up, forgot-password, reset-password
│   ├── auth/               # OAuth callback + sign-out route
│   ├── onboarding/         # workspace creation
│   └── app/                # protected app surface
│       ├── dashboard/
│       ├── sites/[id]/
│       ├── findings/
│       ├── actions/
│       ├── reports/[id]/print/
│       ├── settings/
│       ├── integrations/
│       └── billing/
├── components/
│   ├── ui/                 # button, card, badge, input, demo-badge, empty-state
│   ├── app/                # sidebar + topbar
│   ├── findings/           # finding-card
│   ├── actions/            # action-row
│   └── reports/            # report-view, export-buttons
├── lib/
│   ├── supabase/           # client + server + middleware
│   ├── auth/               # current-org
│   ├── analysis/           # orchestrator + detectors A–H + thresholds
│   ├── scoring/            # priority + explanation
│   ├── reporting/          # build-report + markdown/email export
│   ├── types/              # domain types mirroring the schema
│   └── demo-data/          # demo labels
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── public/favicon.svg
├── middleware.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Security model

- **Row Level Security** is enabled on every domain table. The starter policies in `0001_init.sql` constrain access to organization members only, resolved through the parent site for metrics/findings/reports/actions, and through the `is_org_member()` helper for org-scoped reads.
- The app **only** uses the user's session — no service-role key is referenced anywhere in Phase 1.
- Forms are server actions; mutations go through `createSupabaseServerClient()` and are RLS-checked.
- `.env.local` is gitignored. `.env.example` ships in the repo.
- Middleware refreshes the session on every request and redirects unauthenticated visitors away from `/app/*` and `/onboarding`.

You should still review RLS policies before turning on production traffic — they're starters, not battle-tested.

---

## Known limitations / honest tech debt

- **No automated tests yet.** Detector logic is the highest-priority candidate for unit tests.
- **No background scheduling.** Analysis runs are triggered by a button. Phase 3 needs a cron / queue (Supabase Cron Edge Functions are a natural fit).
- **No multi-organization switching UI.** A user belonging to multiple orgs sees the most-recently created one. Building a switcher is small but deferred.
- **Internal-link detector is conservative.** It only proposes from-strong-to-near-win pairings and explicitly tells the user to verify topical relevance — because Phase 1 has no on-page content to verify it for them.
- **Previous-action follow-up uses substring matching** between the action title/description and the page paths. Phase 2 should add an explicit `action_items.page_path` column.
- **Report sections are stored as JSON snapshots.** That's deliberate — the brief is meant to be a frozen artifact for that week — but be aware that mutating a finding *after* the report is generated will not update the report.
- **Print → PDF only.** No headless-Chromium PDF rendering yet.
- **Per-site CTR curve** isn't built; the detector uses a conservative default curve. With ≥3 months of data, build a per-site curve in Phase 2.
- **No rate limiting** on the analysis button. Fine for Phase 1; add throttling once real users arrive.
- **Email delivery is not wired up.** "Forgot password" emails depend on Supabase's email config — local dev may need SMTP set in the Supabase project.

---

## Phase roadmap

### Phase 2 — Real Google data
- Google OAuth (read-only) with refresh tokens
- GSC property selection per site
- GA4 property selection per site
- Daily sync writing into the existing `gsc_*` / `ga4_*` tables
- Re-auth flow when tokens expire

### Phase 3 — Delivery + scheduling
- Scheduled weekly brief generation (per-site `reporting_day`)
- Email delivery (Resend or similar)
- Optional Slack delivery
- Webhook for "brief generated"

### Phase 4 — Billing
- Stripe subscription + checkout
- Customer portal
- Plan limits enforced server-side (sites, briefs/month)
- Webhooks for subscription state changes

### Phase 5 — Team + agency
- Team invitations + role assignment
- White-label settings per workspace
- Agency client view (read-only share link for a single site's reports)
- Admin area
- Deeper analysis logic (per-site CTR curve, branded-query exclusion, SERP-feature detection)

---

## Honest acceptance summary

| Acceptance criterion | Status |
|---|---|
| Existing static assets remain intact | ✅ — `landing-page/` and `sample-report/` not touched |
| `/saas-app/` exists and runs locally | ✅ once `pnpm install && pnpm dev` is run |
| Auth foundation exists | ✅ |
| Org + site models exist | ✅ |
| Demo data exists | ✅ — `supabase/seed.sql` |
| Demo analysis can run | ✅ |
| Findings generated from deterministic rules | ✅ |
| Findings include evidence and recommended action | ✅ |
| Priority scoring is explainable | ✅ — `score_explanation` on every finding |
| Report can be generated from findings | ✅ |
| Report viewable in the app | ✅ |
| Action items can be created or managed | ✅ |
| App clearly labels demo data | ✅ |
| Google / GA4 / Stripe / email are not falsely presented | ✅ — placeholder pages with explicit "not implemented in Phase 1" |
| README explains setup and limitations | ✅ |
| No secrets hardcoded | ✅ |
| Code clean for Phase 2 integration | ✅ — detectors read from real tables; sync just needs to populate them |

If this isn't true the day you try it, file a bug against this Phase 1 — don't paper over it.
