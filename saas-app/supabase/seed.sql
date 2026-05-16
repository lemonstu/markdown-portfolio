-- Demo seed data for the Weekly Organic Growth Brief app.
-- Run AFTER 0001_init.sql AND after you have signed up at least one user.
-- This script:
--   1. Reads the most recently created auth user
--   2. Creates a demo organization, adds the user as owner
--   3. Creates a demo site (fictional outdoor publisher)
--   4. Inserts GSC + GA4 metrics covering "current" and "prior" 7-day windows
--      sized to deterministically trigger every detector
--
-- Re-running this script will create duplicate orgs/sites; either run once,
-- or wrap your own cleanup at the top.

do $$
declare
  v_user_id   uuid;
  v_org_id    uuid;
  v_site_id   uuid;
  v_curr_start date := current_date - interval '7 days';
  v_curr_end   date := current_date - interval '1 day';
  v_prior_start date := current_date - interval '14 days';
  v_prior_end   date := current_date - interval '8 days';
begin
  -- Use the most recently signed-up user as the org owner.
  select id into v_user_id from auth.users order by created_at desc limit 1;
  if v_user_id is null then
    raise exception 'No auth users found. Sign up at least one user before running seed.sql.';
  end if;

  -- Create org
  insert into public.organizations (name, slug)
  values ('Demo Workspace', 'demo-workspace-' || substr(md5(random()::text), 1, 6))
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  -- Create site
  insert into public.sites (organization_id, name, url, timezone, goal, integration_mode, status)
  values (v_org_id, 'Mountain Journal (Demo)', 'https://mountainjournal.example.com',
          'America/Denver', 'traffic_growth', 'demo', 'active')
  returning id into v_site_id;

  -- ============================================================
  -- GSC page metrics — current week vs prior week
  -- Crafted so detectors fire:
  --   • /guides/best-hiking-boots-2026  — pages_losing_clicks (drop -41%)
  --   • /reviews/lightweight-tents      — rising_impressions_low_ctr (CTR 1.8% at pos 6)
  --   • /reviews/down-jackets           — small lift after prior action follow-up
  --   • /guides/sleeping-bag-temperature-ratings — content_decay (sustained drop)
  --   • /blog/wilderness-first-aid      — seasonal-like drop (lower confidence)
  --   • /reviews/water-filters          — stable; query data triggers cannibalization
  --   • /compare/down-vs-synthetic      — strong "from" page for internal-link suggestion
  --   • /guides/hiking-essentials       — strong "from" page for internal-link suggestion
  --   • /reviews/womens-hiking-boots    — cannibalization partner
  -- ============================================================
  insert into public.gsc_page_metrics
    (site_id, page_path, period_start, period_end, clicks, impressions, ctr, avg_position) values
    -- current period
    (v_site_id, '/guides/best-hiking-boots-2026', v_curr_start, v_curr_end, 361, 11200, 0.0322, 6.80),
    (v_site_id, '/reviews/lightweight-tents',     v_curr_start, v_curr_end, 156,  8650, 0.0180, 6.00),
    (v_site_id, '/reviews/down-jackets',          v_curr_start, v_curr_end, 198,  5800, 0.0341, 5.80),
    (v_site_id, '/guides/sleeping-bag-temperature-ratings', v_curr_start, v_curr_end, 312, 9400, 0.0332, 8.90),
    (v_site_id, '/blog/wilderness-first-aid',     v_curr_start, v_curr_end, 145,  4870, 0.0298, 9.40),
    (v_site_id, '/reviews/water-filters',         v_curr_start, v_curr_end, 240,  6900, 0.0348, 7.20),
    (v_site_id, '/compare/down-vs-synthetic',     v_curr_start, v_curr_end, 248,  7300, 0.0340, 4.20),
    (v_site_id, '/guides/hiking-essentials',      v_curr_start, v_curr_end, 410,  9800, 0.0418, 5.10),
    (v_site_id, '/reviews/womens-hiking-boots',   v_curr_start, v_curr_end, 174,  4600, 0.0378, 5.40),
    (v_site_id, '/blog/national-park-permits-guide', v_curr_start, v_curr_end, 109, 3210, 0.0340, 8.10),
    (v_site_id, '/newsletter',                    v_curr_start, v_curr_end,  88,  2900, 0.0303, 12.10),
    -- prior period
    (v_site_id, '/guides/best-hiking-boots-2026', v_prior_start, v_prior_end, 612, 11650, 0.0526, 3.20),
    (v_site_id, '/reviews/lightweight-tents',     v_prior_start, v_prior_end, 110,  6270, 0.0175, 6.40),
    (v_site_id, '/reviews/down-jackets',          v_prior_start, v_prior_end, 182,  6100, 0.0298, 6.00),
    (v_site_id, '/guides/sleeping-bag-temperature-ratings', v_prior_start, v_prior_end, 354, 9620, 0.0368, 8.40),
    (v_site_id, '/blog/wilderness-first-aid',     v_prior_start, v_prior_end, 233,  7270, 0.0320, 9.10),
    (v_site_id, '/reviews/water-filters',         v_prior_start, v_prior_end, 232,  6700, 0.0346, 7.30),
    (v_site_id, '/compare/down-vs-synthetic',     v_prior_start, v_prior_end, 251,  7440, 0.0337, 4.30),
    (v_site_id, '/guides/hiking-essentials',      v_prior_start, v_prior_end, 415,  9750, 0.0426, 5.00),
    (v_site_id, '/reviews/womens-hiking-boots',   v_prior_start, v_prior_end, 168,  4520, 0.0371, 5.50),
    (v_site_id, '/blog/national-park-permits-guide', v_prior_start, v_prior_end, 121, 3340, 0.0362, 8.30),
    (v_site_id, '/newsletter',                    v_prior_start, v_prior_end,  92,  2980, 0.0309, 11.90);

  -- ============================================================
  -- GSC query metrics — for near-win + CTR + cannibalization detection
  -- ============================================================
  insert into public.gsc_query_metrics
    (site_id, query, period_start, period_end, clicks, impressions, ctr, avg_position) values
    -- current period
    (v_site_id, 'best lightweight tents under $300', v_curr_start, v_curr_end, 35, 1940, 0.0180, 6.00),
    (v_site_id, 'trail running shoes for beginners', v_curr_start, v_curr_end, 16, 1420, 0.0113, 9.10),
    (v_site_id, 'winter camping checklist',          v_curr_start, v_curr_end, 21,  980, 0.0214, 7.40),
    (v_site_id, 'down vs synthetic sleeping bag',    v_curr_start, v_curr_end, 30,  880, 0.0341, 4.20),
    (v_site_id, 'best water filter for backpacking', v_curr_start, v_curr_end,  8,  540, 0.0148, 11.30),
    (v_site_id, 'best hiking boots for women',       v_curr_start, v_curr_end, 22,  610, 0.0361, 5.40),
    (v_site_id, 'best hiking boots 2026',            v_curr_start, v_curr_end, 121, 4400, 0.0275, 6.80),
    (v_site_id, 'how to choose hiking boots',        v_curr_start, v_curr_end, 26,  760, 0.0342, 6.80),
    (v_site_id, 'best trekking poles',               v_curr_start, v_curr_end,  9,  380, 0.0237, 14.70),
    -- prior period (positions a touch better on the boots query → drop)
    (v_site_id, 'best hiking boots 2026',            v_prior_start, v_prior_end, 280, 4520, 0.0619, 3.20);

  -- ============================================================
  -- GSC page–query metrics — supports cannibalization detection
  -- Query "best hiking boots for women" ranks both:
  --   /reviews/womens-hiking-boots (pos 5.4, dominant)
  --   /guides/best-hiking-boots-2026 (pos 12.1, secondary)
  -- ============================================================
  insert into public.gsc_page_query_metrics
    (site_id, page_path, query, period_start, period_end, clicks, impressions, ctr, avg_position) values
    (v_site_id, '/reviews/womens-hiking-boots',    'best hiking boots for women', v_curr_start, v_curr_end, 18, 410, 0.0439, 5.40),
    (v_site_id, '/guides/best-hiking-boots-2026',  'best hiking boots for women', v_curr_start, v_curr_end,  4, 200, 0.0200, 12.10);

  -- ============================================================
  -- GA4 landing-page metrics — supports engagement/conversion mismatch
  -- /newsletter: high engagement, 0 key_events (looks like measurement issue)
  -- /reviews/lightweight-tents: high engagement, low key_events (CTA placement)
  -- ============================================================
  insert into public.ga4_landing_page_metrics
    (site_id, page_path, period_start, period_end, sessions, engaged_sessions, engagement_rate, key_events) values
    -- current 14-day window (we collapse two GSC weeks into one GA4 window for simplicity)
    (v_site_id, '/newsletter',                     v_prior_start, v_curr_end, 412, 321, 0.7791,  0),
    (v_site_id, '/reviews/lightweight-tents',      v_prior_start, v_curr_end, 540, 400, 0.7407,  6),
    (v_site_id, '/guides/best-hiking-boots-2026',  v_prior_start, v_curr_end, 980, 670, 0.6837, 12),
    (v_site_id, '/reviews/down-jackets',           v_prior_start, v_curr_end, 380, 281, 0.7394,  9),
    (v_site_id, '/guides/hiking-essentials',       v_prior_start, v_curr_end, 825, 612, 0.7418, 18),
    (v_site_id, '/compare/down-vs-synthetic',      v_prior_start, v_curr_end, 460, 348, 0.7565, 11),
    (v_site_id, '/blog/wilderness-first-aid',      v_prior_start, v_curr_end, 320, 198, 0.6188,  4),
    (v_site_id, '/guides/sleeping-bag-temperature-ratings', v_prior_start, v_curr_end, 590, 410, 0.6949, 7);

  -- ============================================================
  -- Seed a "previous action" completed last week so the follow-up
  -- detector has something to report on next run.
  -- ============================================================
  insert into public.action_items (site_id, title, description, priority, status, completed_at, notes)
  values (
    v_site_id,
    'Title rewrite on /reviews/down-jackets',
    'Last week''s recommendation — testing CTR uplift on primary query.',
    'p2', 'completed', now() - interval '6 days',
    'Title changed from generic to "Best Down Jackets for Hiking (2026): 11 Tested".'
  );

  raise notice 'Seeded demo workspace: org=%, site=%', v_org_id, v_site_id;
end $$;
