// Domain types for the Weekly Organic Growth Brief app.
// These mirror the Postgres schema in supabase/migrations/0001_init.sql.

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type SiteStatus = "active" | "paused" | "disconnected";
export type SiteGoal =
  | "traffic_growth"
  | "lead_generation"
  | "content_recovery"
  | "agency_client_reporting";
export type IntegrationMode = "demo" | "pending_google_connection" | "connected";

export type FindingType =
  | "pages_losing_clicks"
  | "rising_impressions_low_ctr"
  | "near_win_keywords"
  | "content_decay"
  | "ga4_engagement_mismatch"
  | "cannibalization_risk"
  | "internal_link_opportunity"
  | "previous_action_followup";

export type FindingStatus =
  | "new"
  | "reviewed"
  | "accepted"
  | "dismissed"
  | "completed";

export type PriorityBucket = "p1" | "p2" | "p3";
export type ConfidenceLevel = "high" | "medium" | "low";
export type AnalysisRunStatus = "queued" | "running" | "completed" | "failed";
export type ActionStatus = "open" | "in_progress" | "completed" | "dismissed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  timezone: string;
  goal: SiteGoal;
  status: SiteStatus;
  integration_mode: IntegrationMode;
  created_at: string;
  updated_at: string;
}

export interface GscPageMetric {
  site_id: string;
  page_path: string;
  period_start: string;
  period_end: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
}

export interface GscQueryMetric {
  site_id: string;
  query: string;
  period_start: string;
  period_end: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
}

export interface GscPageQueryMetric {
  site_id: string;
  page_path: string;
  query: string;
  period_start: string;
  period_end: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
}

export interface Ga4LandingPageMetric {
  site_id: string;
  page_path: string;
  period_start: string;
  period_end: string;
  sessions: number;
  engaged_sessions: number;
  engagement_rate: number;
  key_events: number;
}

export interface AnalysisRun {
  id: string;
  site_id: string;
  status: AnalysisRunStatus;
  current_period_start: string;
  current_period_end: string;
  prior_period_start: string;
  prior_period_end: string;
  findings_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Finding {
  id: string;
  site_id: string;
  analysis_run_id: string | null;
  finding_type: FindingType;
  page_path: string | null;
  query: string | null;
  title: string;
  evidence: Record<string, unknown>;
  why_it_matters: string;
  recommended_action: string;
  priority: PriorityBucket;
  priority_score: number;
  impact_score: number;
  effort_score: number;
  confidence: ConfidenceLevel;
  score_explanation: string;
  source_dataset: string;
  date_range_start: string;
  date_range_end: string;
  status: FindingStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  site_id: string;
  analysis_run_id: string | null;
  title: string;
  period_start: string;
  period_end: string;
  executive_summary: string;
  created_at: string;
}

export interface ReportSection {
  id: string;
  report_id: string;
  section_key: string;
  title: string;
  body: { items: Finding[] } | Record<string, unknown>;
  sort_order: number;
}

export interface ActionItem {
  id: string;
  site_id: string;
  finding_id: string | null;
  title: string;
  description: string | null;
  priority: PriorityBucket;
  status: ActionStatus;
  assigned_user_id: string | null;
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------
// Detector input shape — what each detector receives.
// ----------------------------------------------------------------
export interface DetectorInput {
  site: Site;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  priorPeriodStart: string;
  priorPeriodEnd: string;
  gscPagesCurrent: GscPageMetric[];
  gscPagesPrior: GscPageMetric[];
  gscQueriesCurrent: GscQueryMetric[];
  gscQueriesPrior: GscQueryMetric[];
  gscPageQueriesCurrent: GscPageQueryMetric[];
  ga4LandingPages: Ga4LandingPageMetric[];
  previousCompletedActions: ActionItem[];
}

// ----------------------------------------------------------------
// Detector output shape — the precursor to a Finding row.
// ----------------------------------------------------------------
export interface DetectorFinding {
  finding_type: FindingType;
  page_path: string | null;
  query: string | null;
  title: string;
  evidence: Record<string, unknown>;
  why_it_matters: string;
  recommended_action: string;
  impact_score: number; // 1-5
  effort_score: number; // 1-5
  confidence: ConfidenceLevel;
  source_dataset: string;
}
