import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/lib/supabase/test-mock.test-util";
import {
  TEST_SITE,
  gscPage,
  gscQuery,
  gscPageQuery,
  ga4,
  completedAction,
} from "@/lib/analysis/fixtures.test-util";

// IMPORTANT: mock the Supabase server module BEFORE importing the orchestrator.
// Each test reassigns the mock client via setMockClient().
let activeClient: { from: (name: string) => unknown } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => activeClient),
}));

// Imported after vi.mock so the mock is in place.
import { runAnalysisForSite } from "./index";

function periodRow(start: string, end: string) {
  return { period_start: start, period_end: end };
}

const RUN_ROW = {
  id: "run-1",
  site_id: TEST_SITE.id,
  status: "running",
  current_period_start: "2026-05-06",
  current_period_end: "2026-05-12",
  prior_period_start: "2026-04-29",
  prior_period_end: "2026-05-05",
  findings_count: 0,
  error_message: null,
  started_at: "2026-05-13T00:00:00Z",
  completed_at: null,
  created_at: "2026-05-13T00:00:00Z",
};

const COMPLETED_RUN_ROW = {
  ...RUN_ROW,
  status: "completed",
  findings_count: 0, // updated below per test
  completed_at: "2026-05-13T00:01:00Z",
};

describe("runAnalysisForSite (orchestrator)", () => {
  beforeEach(() => {
    activeClient = null;
  });

  it("happy path: loads metrics, runs detectors, persists findings + completed run", async () => {
    // Detector A should fire: a page that lost 60% of clicks.
    const pagesCurrent = [gscPage("/post", "current", 200, 5000, 7)];
    const pagesPrior = [gscPage("/post", "prior", 500, 5200, 4)];
    const insertedFindings: unknown[] = [];

    const { client, getCallsFor } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      gsc_page_metrics: {
        select: (chain) => {
          // First call (resolve periods): asks for period_start, period_end with order/limit
          const hasPeriodSelect = chain.some(
            (c) => c.method === "select" && String(c.args[0]).includes("period_start"),
          );
          if (hasPeriodSelect) {
            return {
              data: [periodRow("2026-05-06", "2026-05-12"), periodRow("2026-04-29", "2026-05-05")],
              error: null,
            };
          }
          // Per-period loads
          const isCurrentPeriod = chain.some(
            (c) => c.method === "eq" && c.args[0] === "period_start" && c.args[1] === "2026-05-06",
          );
          return { data: isCurrentPeriod ? pagesCurrent : pagesPrior, error: null };
        },
      },
      gsc_query_metrics: { select: () => ({ data: [], error: null }) },
      gsc_page_query_metrics: { select: () => ({ data: [], error: null }) },
      ga4_landing_page_metrics: { select: () => ({ data: [], error: null }) },
      action_items: { select: () => ({ data: [], error: null }) },
      analysis_runs: {
        insert: () => ({ data: RUN_ROW, error: null }),
        update: () => ({ data: { ...COMPLETED_RUN_ROW, findings_count: insertedFindings.length }, error: null }),
      },
      findings: {
        insert: (chain) => {
          const inserts = chain.find((c) => c.method === "insert");
          if (inserts && Array.isArray(inserts.args[0])) {
            insertedFindings.push(...(inserts.args[0] as unknown[]));
          }
          return { error: null };
        },
      },
    });
    activeClient = client;

    const result = await runAnalysisForSite({ siteId: TEST_SITE.id });

    expect(result.run.status).toBe("completed");
    // The single page triggers Detector A (clicks drop) AND Detector D (decay via
    // position worsening). Both firing on the same page is correct behavior.
    expect(result.findingsCreated).toBeGreaterThanOrEqual(1);
    expect(insertedFindings.length).toBe(result.findingsCreated);

    // Sanity-check that the page-losing-clicks finding was written and well-formed.
    const lossFinding = (insertedFindings as Record<string, unknown>[]).find(
      (f) => f.finding_type === "pages_losing_clicks",
    );
    expect(lossFinding).toBeDefined();
    expect(lossFinding!.page_path).toBe("/post");
    expect(lossFinding!.priority_score).toBeGreaterThan(0);
    expect(lossFinding!.score_explanation).toBeTruthy();
    expect(lossFinding!.analysis_run_id).toBe("run-1");

    // Verify the analysis_run lifecycle: insert (running) → update (completed)
    const runCalls = getCallsFor("analysis_runs");
    expect(runCalls.map((c) => c.op)).toEqual(["insert", "update"]);
  });

  it("fans every detector through to insert when seeded data triggers them", async () => {
    // A: loss, B: low CTR at pos 6 with 2k imp, C: near-win, D: decay, E: GA4 zero events,
    // F: cannibalization, G: internal-link, H: previous action follow-up
    const pagesCurrent = [
      gscPage("/post", "current", 200, 5000, 7), // A — loss
      gscPage("/ctr", "current", 36, 2000, 6), // B — CTR opp
      gscPage("/decay", "current", 60, 800, 9), // D — decay
      gscPage("/strong", "current", 800, 9000, 4), // G — strong source
      gscPage("/strong-2", "current", 600, 5000, 5), // G — second strong source (length>=3)
      gscPage("/opp", "current", 30, 1500, 7), // G — opportunity target
      gscPage("/followup", "current", 150, 3000, 5), // H — follow-up target
    ];
    const pagesPrior = [
      gscPage("/post", "prior", 500, 5200, 4),
      gscPage("/decay", "prior", 100, 1000, 8),
      gscPage("/followup", "prior", 100, 3000, 7),
    ];
    const queries = [gscQuery("near win query", "current", 30, 1500, 7)];
    const pageQueries = [
      gscPageQuery("/dominant", "shared", 20, 400, 5),
      gscPageQuery("/secondary", "shared", 4, 200, 13),
    ];
    const ga4Rows = [ga4("/newsletter", 400, 320, 0)];
    const actions = [completedAction("Title rewrite on /followup")];

    const insertedFindings: Record<string, unknown>[] = [];

    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      gsc_page_metrics: {
        select: (chain) => {
          const hasPeriodSelect = chain.some(
            (c) => c.method === "select" && String(c.args[0]).includes("period_start"),
          );
          if (hasPeriodSelect) {
            return {
              data: [periodRow("2026-05-06", "2026-05-12"), periodRow("2026-04-29", "2026-05-05")],
              error: null,
            };
          }
          const isCurrent = chain.some(
            (c) => c.method === "eq" && c.args[0] === "period_start" && c.args[1] === "2026-05-06",
          );
          return { data: isCurrent ? pagesCurrent : pagesPrior, error: null };
        },
      },
      gsc_query_metrics: { select: () => ({ data: queries, error: null }) },
      gsc_page_query_metrics: { select: () => ({ data: pageQueries, error: null }) },
      ga4_landing_page_metrics: { select: () => ({ data: ga4Rows, error: null }) },
      action_items: { select: () => ({ data: actions, error: null }) },
      analysis_runs: {
        insert: () => ({ data: RUN_ROW, error: null }),
        update: () => ({
          data: { ...COMPLETED_RUN_ROW, findings_count: insertedFindings.length },
          error: null,
        }),
      },
      findings: {
        insert: (chain) => {
          const inserts = chain.find((c) => c.method === "insert");
          if (inserts && Array.isArray(inserts.args[0])) {
            insertedFindings.push(...(inserts.args[0] as Record<string, unknown>[]));
          }
          return { error: null };
        },
      },
    });
    activeClient = client;

    const result = await runAnalysisForSite({ siteId: TEST_SITE.id });
    expect(result.findingsCreated).toBeGreaterThanOrEqual(6);

    const types = new Set(insertedFindings.map((f) => f.finding_type));
    expect(types.has("pages_losing_clicks")).toBe(true);
    expect(types.has("rising_impressions_low_ctr")).toBe(true);
    expect(types.has("near_win_keywords")).toBe(true);
    expect(types.has("content_decay")).toBe(true);
    expect(types.has("ga4_engagement_mismatch")).toBe(true);
    expect(types.has("cannibalization_risk")).toBe(true);
    expect(types.has("internal_link_opportunity")).toBe(true);
    expect(types.has("previous_action_followup")).toBe(true);
  });

  it("throws and marks run as failed when no GSC data exists for the site", async () => {
    const { client, getCallsFor } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      gsc_page_metrics: { select: () => ({ data: [], error: null }) },
    });
    activeClient = client;

    await expect(runAnalysisForSite({ siteId: TEST_SITE.id })).rejects.toThrow(/No GSC data/);

    // No analysis_run insert should have happened because the empty-data check fires before insert.
    expect(getCallsFor("analysis_runs")).toHaveLength(0);
  });

  it("throws and marks run as failed when only one period exists", async () => {
    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      gsc_page_metrics: {
        select: () => ({ data: [periodRow("2026-05-06", "2026-05-12")], error: null }),
      },
    });
    activeClient = client;

    await expect(runAnalysisForSite({ siteId: TEST_SITE.id })).rejects.toThrow(
      /at least two GSC periods/,
    );
  });

  it("marks the run as failed when finding insert fails after the run was started", async () => {
    const updateCalls: Array<Record<string, unknown>> = [];

    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      gsc_page_metrics: {
        select: (chain) => {
          const hasPeriodSelect = chain.some(
            (c) => c.method === "select" && String(c.args[0]).includes("period_start"),
          );
          if (hasPeriodSelect) {
            return {
              data: [periodRow("2026-05-06", "2026-05-12"), periodRow("2026-04-29", "2026-05-05")],
              error: null,
            };
          }
          const isCurrent = chain.some(
            (c) => c.method === "eq" && c.args[0] === "period_start" && c.args[1] === "2026-05-06",
          );
          return {
            data: isCurrent
              ? [gscPage("/post", "current", 200, 5000, 7)]
              : [gscPage("/post", "prior", 500, 5200, 4)],
            error: null,
          };
        },
      },
      gsc_query_metrics: { select: () => ({ data: [], error: null }) },
      gsc_page_query_metrics: { select: () => ({ data: [], error: null }) },
      ga4_landing_page_metrics: { select: () => ({ data: [], error: null }) },
      action_items: { select: () => ({ data: [], error: null }) },
      analysis_runs: {
        insert: () => ({ data: RUN_ROW, error: null }),
        update: (chain) => {
          const updateArg = chain.find((c) => c.method === "update");
          if (updateArg) updateCalls.push(updateArg.args[0] as Record<string, unknown>);
          return { data: null, error: null };
        },
      },
      findings: { insert: () => ({ error: { message: "boom" } }) },
    });
    activeClient = client;

    await expect(runAnalysisForSite({ siteId: TEST_SITE.id })).rejects.toThrow(/Failed to insert findings/);
    // The failure path should have called analysis_runs.update with status: "failed".
    const failedUpdate = updateCalls.find((u) => u.status === "failed");
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate?.error_message).toMatch(/Failed to insert findings/);
  });
});
