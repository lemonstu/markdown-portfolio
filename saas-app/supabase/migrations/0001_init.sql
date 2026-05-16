-- Weekly Organic Growth Brief — initial schema
-- Run in Supabase SQL editor (Project → SQL → New query → paste → Run).
-- Designed for Postgres + Supabase Auth + Row Level Security.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- PROFILES (one row per auth user)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS + MEMBERSHIPS
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();

create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);

-- Helper: does the current auth user belong to a given org?
create or replace function public.is_org_member(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- ============================================================
-- SITES
-- ============================================================
create type public.site_status as enum ('active', 'paused', 'disconnected');
create type public.site_goal as enum (
  'traffic_growth',
  'lead_generation',
  'content_recovery',
  'agency_client_reporting'
);
create type public.integration_mode as enum (
  'demo',
  'pending_google_connection',
  'connected'
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  url text not null,
  timezone text not null default 'UTC',
  goal public.site_goal not null default 'traffic_growth',
  status public.site_status not null default 'active',
  integration_mode public.integration_mode not null default 'demo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_org_idx on public.sites(organization_id);
create trigger sites_set_updated_at before update on public.sites
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- RAW METRICS TABLES
-- (one row per site/page/query/day OR site/page/period; Phase 1 uses period rows)
-- ============================================================
create table public.gsc_page_metrics (
  id bigserial primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  page_path text not null,
  period_start date not null,
  period_end date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(6,4) not null default 0,
  avg_position numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, page_path, period_start, period_end)
);
create index gsc_page_metrics_site_period_idx
  on public.gsc_page_metrics(site_id, period_end desc);

create table public.gsc_query_metrics (
  id bigserial primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  query text not null,
  period_start date not null,
  period_end date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(6,4) not null default 0,
  avg_position numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, query, period_start, period_end)
);
create index gsc_query_metrics_site_period_idx
  on public.gsc_query_metrics(site_id, period_end desc);

create table public.gsc_page_query_metrics (
  id bigserial primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  page_path text not null,
  query text not null,
  period_start date not null,
  period_end date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(6,4) not null default 0,
  avg_position numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, page_path, query, period_start, period_end)
);
create index gsc_pq_site_period_idx
  on public.gsc_page_query_metrics(site_id, period_end desc);

create table public.ga4_landing_page_metrics (
  id bigserial primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  page_path text not null,
  period_start date not null,
  period_end date not null,
  sessions integer not null default 0,
  engaged_sessions integer not null default 0,
  engagement_rate numeric(6,4) not null default 0,
  key_events integer not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, page_path, period_start, period_end)
);
create index ga4_lp_site_period_idx
  on public.ga4_landing_page_metrics(site_id, period_end desc);

-- ============================================================
-- ANALYSIS RUNS, FINDINGS, REPORTS, ACTIONS
-- ============================================================
create type public.analysis_run_status as enum ('queued', 'running', 'completed', 'failed');

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  status public.analysis_run_status not null default 'queued',
  current_period_start date not null,
  current_period_end date not null,
  prior_period_start date not null,
  prior_period_end date not null,
  findings_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index analysis_runs_site_idx on public.analysis_runs(site_id, created_at desc);

create type public.finding_type as enum (
  'pages_losing_clicks',
  'rising_impressions_low_ctr',
  'near_win_keywords',
  'content_decay',
  'ga4_engagement_mismatch',
  'cannibalization_risk',
  'internal_link_opportunity',
  'previous_action_followup'
);

create type public.finding_status as enum (
  'new',
  'reviewed',
  'accepted',
  'dismissed',
  'completed'
);

create type public.priority_bucket as enum ('p1', 'p2', 'p3');
create type public.confidence_level as enum ('high', 'medium', 'low');

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  finding_type public.finding_type not null,
  page_path text,
  query text,
  title text not null,
  evidence jsonb not null default '{}'::jsonb,
  why_it_matters text not null,
  recommended_action text not null,
  priority public.priority_bucket not null default 'p2',
  priority_score numeric(6,2) not null default 0,
  impact_score integer not null default 3,
  effort_score integer not null default 3,
  confidence public.confidence_level not null default 'medium',
  score_explanation text not null default '',
  source_dataset text not null,
  date_range_start date not null,
  date_range_end date not null,
  status public.finding_status not null default 'new',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index findings_site_idx on public.findings(site_id);
create index findings_run_idx on public.findings(analysis_run_id);
create index findings_status_idx on public.findings(site_id, status);
create trigger findings_set_updated_at before update on public.findings
  for each row execute function public.tg_set_updated_at();

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  title text not null,
  period_start date not null,
  period_end date not null,
  executive_summary text not null default '',
  created_at timestamptz not null default now()
);
create index reports_site_idx on public.reports(site_id, created_at desc);

create table public.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  section_key text not null,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);
create index report_sections_report_idx on public.report_sections(report_id, sort_order);

create type public.action_status as enum ('open', 'in_progress', 'completed', 'dismissed');

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  finding_id uuid references public.findings(id) on delete set null,
  title text not null,
  description text,
  priority public.priority_bucket not null default 'p2',
  status public.action_status not null default 'open',
  assigned_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index action_items_site_idx on public.action_items(site_id);
create index action_items_status_idx on public.action_items(site_id, status);
create trigger action_items_set_updated_at before update on public.action_items
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Phase 1 policies: read/write only if the caller is a member
-- of the row's organization (resolved via the parent site).
-- ============================================================
alter table public.profiles                  enable row level security;
alter table public.organizations             enable row level security;
alter table public.organization_members      enable row level security;
alter table public.sites                     enable row level security;
alter table public.gsc_page_metrics          enable row level security;
alter table public.gsc_query_metrics         enable row level security;
alter table public.gsc_page_query_metrics    enable row level security;
alter table public.ga4_landing_page_metrics  enable row level security;
alter table public.analysis_runs             enable row level security;
alter table public.findings                  enable row level security;
alter table public.reports                   enable row level security;
alter table public.report_sections           enable row level security;
alter table public.action_items              enable row level security;

-- profiles: a user can read & update their own profile
create policy "profile self read"
  on public.profiles for select
  using (id = auth.uid());
create policy "profile self update"
  on public.profiles for update
  using (id = auth.uid());

-- organizations: read if member; insert by any authed user (becomes owner via app code);
-- update/delete by owners/admins only
create policy "org member read"
  on public.organizations for select
  using (public.is_org_member(id));
create policy "org insert by authed"
  on public.organizations for insert
  with check (auth.role() = 'authenticated');
create policy "org owner update"
  on public.organizations for update
  using (exists (
    select 1 from public.organization_members
    where organization_id = id and user_id = auth.uid()
      and role in ('owner', 'admin')
  ));

-- organization_members: read your memberships; insert when joining/creating
-- (handled by server-side flow). Phase 1 keeps insert/delete server-controlled.
create policy "members read own"
  on public.organization_members for select
  using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "members insert self"
  on public.organization_members for insert
  with check (user_id = auth.uid());

-- sites: org-scoped
create policy "sites select"   on public.sites for select using (public.is_org_member(organization_id));
create policy "sites insert"   on public.sites for insert with check (public.is_org_member(organization_id));
create policy "sites update"   on public.sites for update using (public.is_org_member(organization_id));
create policy "sites delete"   on public.sites for delete using (public.is_org_member(organization_id));

-- metrics + analysis + findings + reports + actions: scoped via the site's org
create or replace function public.site_org(site uuid)
returns uuid language sql security definer stable as $$
  select organization_id from public.sites where id = site;
$$;

create policy "gsc_page_metrics scoped" on public.gsc_page_metrics for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "gsc_query_metrics scoped" on public.gsc_query_metrics for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "gsc_page_query_metrics scoped" on public.gsc_page_query_metrics for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "ga4_landing_page_metrics scoped" on public.ga4_landing_page_metrics for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "analysis_runs scoped" on public.analysis_runs for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "findings scoped" on public.findings for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "reports scoped" on public.reports for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));

create policy "report_sections scoped" on public.report_sections for all
  using (exists (
    select 1 from public.reports r
    where r.id = report_id and public.is_org_member(public.site_org(r.site_id))
  ))
  with check (exists (
    select 1 from public.reports r
    where r.id = report_id and public.is_org_member(public.site_org(r.site_id))
  ));

create policy "action_items scoped" on public.action_items for all
  using (public.is_org_member(public.site_org(site_id)))
  with check (public.is_org_member(public.site_org(site_id)));
