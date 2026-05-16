// Test fixtures shared across detector unit tests.
// Kept in a non-`.test.ts` file so Vitest doesn't try to run it as a suite.

import type {
  ActionItem,
  DetectorInput,
  Ga4LandingPageMetric,
  GscPageMetric,
  GscPageQueryMetric,
  GscQueryMetric,
  Site,
} from "@/lib/types/domain";

const SITE_ID = "11111111-1111-1111-1111-111111111111";

export const TEST_SITE: Site = {
  id: SITE_ID,
  organization_id: "00000000-0000-0000-0000-000000000000",
  name: "Test Site",
  url: "https://test.example.com",
  timezone: "UTC",
  goal: "traffic_growth",
  status: "active",
  integration_mode: "demo",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

const CURRENT_START = "2026-05-06";
const CURRENT_END = "2026-05-12";
const PRIOR_START = "2026-04-29";
const PRIOR_END = "2026-05-05";

export function gscPage(
  path: string,
  period: "current" | "prior",
  clicks: number,
  impressions: number,
  avg_position: number,
): GscPageMetric {
  const [period_start, period_end] =
    period === "current" ? [CURRENT_START, CURRENT_END] : [PRIOR_START, PRIOR_END];
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  return {
    site_id: SITE_ID,
    page_path: path,
    period_start,
    period_end,
    clicks,
    impressions,
    ctr,
    avg_position,
  };
}

export function gscQuery(
  query: string,
  period: "current" | "prior",
  clicks: number,
  impressions: number,
  avg_position: number,
): GscQueryMetric {
  const [period_start, period_end] =
    period === "current" ? [CURRENT_START, CURRENT_END] : [PRIOR_START, PRIOR_END];
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  return {
    site_id: SITE_ID,
    query,
    period_start,
    period_end,
    clicks,
    impressions,
    ctr,
    avg_position,
  };
}

export function gscPageQuery(
  page_path: string,
  query: string,
  clicks: number,
  impressions: number,
  avg_position: number,
): GscPageQueryMetric {
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  return {
    site_id: SITE_ID,
    page_path,
    query,
    period_start: CURRENT_START,
    period_end: CURRENT_END,
    clicks,
    impressions,
    ctr,
    avg_position,
  };
}

export function ga4(
  page_path: string,
  sessions: number,
  engaged_sessions: number,
  key_events: number,
): Ga4LandingPageMetric {
  return {
    site_id: SITE_ID,
    page_path,
    period_start: PRIOR_START,
    period_end: CURRENT_END,
    sessions,
    engaged_sessions,
    engagement_rate: sessions === 0 ? 0 : engaged_sessions / sessions,
    key_events,
  };
}

export function completedAction(title: string, description: string | null = null): ActionItem {
  return {
    id: crypto.randomUUID(),
    site_id: SITE_ID,
    finding_id: null,
    title,
    description,
    priority: "p2",
    status: "completed",
    assigned_user_id: null,
    due_date: null,
    notes: null,
    completed_at: "2026-05-05T00:00:00Z",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-05T00:00:00Z",
  };
}

export function makeInput(overrides: Partial<DetectorInput>): DetectorInput {
  return {
    site: TEST_SITE,
    currentPeriodStart: CURRENT_START,
    currentPeriodEnd: CURRENT_END,
    priorPeriodStart: PRIOR_START,
    priorPeriodEnd: PRIOR_END,
    gscPagesCurrent: [],
    gscPagesPrior: [],
    gscQueriesCurrent: [],
    gscQueriesPrior: [],
    gscPageQueriesCurrent: [],
    ga4LandingPages: [],
    previousCompletedActions: [],
    ...overrides,
  };
}
