# Phase 1 end-to-end smoke checklist

A manual click-through that verifies the Weekly Organic Growth Brief Phase 1 app
actually works end-to-end against a real Supabase project. Run this once after
any non-trivial change before you call Phase 1 stable.

This checklist is **not** an automated browser test — that would need Playwright
and a long-lived Supabase test project. It's a script that takes about
**10 minutes** to walk through manually.

If any step fails, file a bug. Don't paper over it.

---

## 0. Prerequisites

- [ ] Node 22 (`node --version`)
- [ ] pnpm (`pnpm --version`)
- [ ] A free Supabase project. Save the URL + anon key.
- [ ] `saas-app/.env.local` filled in:
  - `NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`
  - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Supabase Authentication → URL Configuration:
  - Site URL: `http://localhost:3000`
  - Redirect URLs include: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`
- [ ] Supabase Authentication → Providers → Email enabled. **Disable "Confirm email"** for local dev (re-enable in prod).
- [ ] In the Supabase SQL editor: paste and run `supabase/migrations/0001_init.sql`. Expect success with no errors.

## 1. Install + verify the build

```bash
cd saas-app
pnpm install
pnpm typecheck     # expect: no output (clean)
pnpm test          # expect: 50 / 50 passing
pnpm build         # expect: 20 routes, no errors
pnpm dev           # http://localhost:3000
```

- [ ] `pnpm install` finishes without error.
- [ ] `pnpm typecheck` produces no errors.
- [ ] `pnpm test` reports `50 passed (50)`.
- [ ] `pnpm build` finishes with `✓ Compiled successfully` and lists 20 routes.
- [ ] `pnpm dev` boots; visiting `/` redirects to `/sign-in`.

## 2. Account creation

- [ ] Open `http://localhost:3000`. You land on `/sign-in`.
- [ ] Click **Create account**. Fill name + email + password (≥ 8 chars). Submit.
- [ ] If "Confirm email" is enabled: open the email, click the link. Otherwise you're redirected to `/onboarding`.
- [ ] On `/onboarding`, enter a workspace name (e.g. "Demo Agency"). Submit.
- [ ] You land on `/app/sites/new?onboarding=1`.

## 3. First site

- [ ] Fill in name (e.g. "Mountain Journal"), URL, pick a timezone, pick a goal. Submit.
- [ ] You land on `/app/sites/[id]`. The site card shows the **Demo** badge.
- [ ] Site profile lists goal, status (`active`), timezone, created date.

## 4. Seed demo data

- [ ] Back in Supabase SQL editor, paste and run `supabase/seed.sql`.
- [ ] Confirm the success notice ("Seeded demo workspace…").
- [ ] **Important:** the seed creates a *new* org + site for you. In the app, navigate to `/app/sites`. You should now see **two** sites: the one you created manually (with no metrics) and the seeded `Mountain Journal (Demo)` (with metrics).
- [ ] Click into the seeded `Mountain Journal (Demo)` site.

## 5. Run analysis

- [ ] On the seeded site detail page, click **Run demo analysis**.
- [ ] After a moment the page reloads showing:
  - Open findings card populated with at least 5 entries
  - Recent analysis runs table with one `completed` row and a findings_count ≥ 6

## 6. Generate brief

- [ ] Click **Generate brief**.
- [ ] You're redirected to `/app/reports/[id]`.
- [ ] The brief renders:
  - Title contains the site name + period
  - Executive summary mentions findings count + top P1
  - All 13 sections visible (some may say "No findings in this section.")
  - Each finding card shows Priority badge, Impact, Effort, Confidence, "Why it matters", "Recommended action", and one italic explanation line
  - **Demo** badge visible near the top
  - Footer mentions "Brief built from demo data."

## 7. Exports

- [ ] Click **Copy summary** → the button says "Copied". Paste into a text editor. You should see the executive summary text.
- [ ] Click **Copy email summary** → paste and check the format includes "Subject:", the summary, and a numbered list of top actions.
- [ ] Click **Download .md** → a file named `weekly-organic-growth-brief.md` downloads. Open it. It should contain the title, exec summary, all 13 sections, every finding's priority/impact/effort/confidence line.
- [ ] Click **Print view**. A new tab opens with the brief on a white background, no sidebar/topbar.
- [ ] In the print tab: `Ctrl/Cmd + P`. The browser print preview should look clean (no UI chrome).
- [ ] Save as PDF. Verify the PDF opens correctly.

## 8. Finding lifecycle

- [ ] Go to `/app/findings`.
- [ ] At the top, set filter `Priority = P1` and click **Apply filters**. You should see only P1 findings.
- [ ] Reset the filter (Priority = All, Status = Open) and Apply.
- [ ] On any finding card, click **Dismiss**. The status text below should update.
- [ ] On another finding card, click **Create action**.
- [ ] Navigate to `/app/actions`. The action you just created appears with status `open`.

## 9. Action lifecycle

- [ ] On the actions page, change the status of one action to `in_progress`. It saves.
- [ ] Click "+ add note" on a row, type something, click **Save notes**. The note is persisted.
- [ ] Set another action's status to `completed`. It moves visually but stays on the page.

## 10. Dashboard

- [ ] Navigate to `/app/dashboard`.
- [ ] Confirm all widgets populate:
  - Active sites lists your sites
  - Latest reports shows the brief you generated
  - Urgent findings (P1) lists at least one item if any P1 finding is open
  - Growth opportunities populated (CTR / near-win / internal-link items)
  - Actions widget shows open + completed counts that match what you set
  - Recent analysis runs lists your `completed` run

## 11. Honest placeholders

- [ ] Navigate to `/app/integrations`. All four integrations show "Not implemented in Phase 1" or "Phase 2+" tag. **No "Connect Google" button exists.**
- [ ] Navigate to `/app/billing`. Reference plans visible. **No checkout button exists.** Page header explicitly says "Stripe billing is not implemented in Phase 1."
- [ ] Navigate to `/app/settings`. Profile + Workspace forms work. The Report defaults card shows disabled selects with a Phase 3 note. Team card shows a Phase 5 note.

## 12. Auth lifecycle

- [ ] From the topbar, click **Sign out**. You land on `/sign-in`.
- [ ] Try to visit `/app/dashboard` directly while signed out. You're redirected to `/sign-in?next=/app/dashboard`.
- [ ] Sign back in. You're redirected to `/app/dashboard`.
- [ ] Go to `/forgot-password`. Submit your email. You should see the "If that email is registered…" message (or an actual email if Supabase SMTP is configured).

## 13. RLS sanity check (optional but recommended)

- [ ] In Supabase SQL editor, open the **Table Editor**.
- [ ] Pick the `findings` table. The **Authentication** dropdown at the top should show `RLS enabled`.
- [ ] Try to read a row as `anon`. It should be denied (no rows returned).
- [ ] Try to read as `authenticated` with a JWT for *your* user. It should return rows.
- [ ] Try to read as `authenticated` with a JWT for a *different* user (not a member of the org). It should return zero rows.

---

## Pass criteria

Phase 1 is smoke-stable when **every box above can be checked in one sitting** on a fresh Supabase project. If any step fails, capture the failing step and a one-line summary in `saas-app/README.md` under "Known limitations" before continuing to Phase 2 work.

## What this checklist does NOT cover

These are real gaps; they're handled in later phases or by their own scripts:

- Real Google Search Console / GA4 OAuth flow (Phase 2)
- Real metric sync (Phase 2)
- Email delivery + scheduled briefs (Phase 3)
- Stripe checkout + plan limits (Phase 4)
- Team invitations (Phase 5)
- Performance under load
- Cross-browser quirks beyond Chromium-based browsers
- Mobile usability (the app is functional on mobile but not visually polished)
- Accessibility audit (basic semantics in place; no formal a11y pass yet)
