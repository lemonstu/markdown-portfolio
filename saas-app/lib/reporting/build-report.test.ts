import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/lib/supabase/test-mock.test-util";
import { TEST_SITE } from "@/lib/analysis/fixtures.test-util";
import type { Finding } from "@/lib/types/domain";

let activeClient: { from: (name: string) => unknown } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => activeClient),
}));

import { buildReportFromRun } from "./build-report";

function mkFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: crypto.randomUUID(),
    site_id: TEST_SITE.id,
    analysis_run_id: "run-1",
    finding_type: "pages_losing_clicks",
    page_path: "/x",
    query: null,
    title: "Page /x lost 41% of clicks",
    evidence: { current_clicks: 100, prior_clicks: 170 },
    why_it_matters: "It matters.",
    recommended_action: "Refresh the intro.",
    priority: "p1",
    priority_score: 85,
    impact_score: 5,
    effort_score: 2,
    confidence: "high",
    score_explanation: "High priority — driven by high impact (5/5).",
    source_dataset: "gsc_page_metrics",
    date_range_start: "2026-05-06",
    date_range_end: "2026-05-12",
    status: "new",
    note: null,
    created_at: "2026-05-13T00:00:00Z",
    updated_at: "2026-05-13T00:00:00Z",
    ...overrides,
  };
}

const RUN = {
  id: "run-1",
  site_id: TEST_SITE.id,
  status: "completed",
  current_period_start: "2026-05-06",
  current_period_end: "2026-05-12",
  prior_period_start: "2026-04-29",
  prior_period_end: "2026-05-05",
  findings_count: 1,
  error_message: null,
  started_at: null,
  completed_at: null,
  created_at: "2026-05-13T00:00:00Z",
};

describe("buildReportFromRun", () => {
  beforeEach(() => {
    activeClient = null;
  });

  it("creates a report row and 13 sections from findings", async () => {
    const findings: Finding[] = [
      mkFinding({ finding_type: "pages_losing_clicks", title: "loss A" }),
      mkFinding({ finding_type: "rising_impressions_low_ctr", title: "ctr B", priority: "p2" }),
      mkFinding({ finding_type: "near_win_keywords", title: "near C", priority: "p2" }),
      mkFinding({ finding_type: "content_decay", title: "decay D", priority: "p3" }),
      mkFinding({ finding_type: "ga4_engagement_mismatch", title: "ga4 E" }),
      mkFinding({ finding_type: "cannibalization_risk", title: "cannib F", priority: "p3" }),
      mkFinding({ finding_type: "internal_link_opportunity", title: "il G", priority: "p3" }),
      mkFinding({ finding_type: "previous_action_followup", title: "followup H", priority: "p3" }),
    ];

    let createdReport: Record<string, unknown> | null = null;
    let createdSections: Record<string, unknown>[] = [];

    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      analysis_runs: { select: () => ({ data: RUN, error: null }) },
      findings: { select: () => ({ data: findings, error: null }) },
      reports: {
        insert: (chain) => {
          const ins = chain.find((c) => c.method === "insert");
          createdReport = ins?.args[0] as Record<string, unknown>;
          return {
            data: { id: "report-1", ...(createdReport ?? {}) },
            error: null,
          };
        },
      },
      report_sections: {
        insert: (chain) => {
          const ins = chain.find((c) => c.method === "insert");
          createdSections = (ins?.args[0] as Record<string, unknown>[]) ?? [];
          return { error: null };
        },
      },
    });
    activeClient = client;

    const { reportId } = await buildReportFromRun({
      siteId: TEST_SITE.id,
      analysisRunId: "run-1",
    });
    expect(reportId).toBe("report-1");

    expect(createdReport).not.toBeNull();
    expect(createdReport!.title).toMatch(/Weekly Organic Growth Brief/);
    expect(createdReport!.period_start).toBe("2026-05-06");
    expect((createdReport!.executive_summary as string).length).toBeGreaterThan(50);

    // 13 sections in the spec order
    expect(createdSections).toHaveLength(13);

    const sectionKeys = createdSections.map((s) => s.section_key);
    expect(sectionKeys).toEqual([
      "executive_summary",
      "urgent_risks",
      "growth_opportunities",
      "pages_losing_clicks",
      "ctr_opportunities",
      "near_win_keywords",
      "content_decay",
      "cannibalization",
      "internal_links",
      "ga4_mismatch",
      "previous_actions",
      "action_list",
      "next_week_watchlist",
    ]);

    // Each detector finding lands in its primary section
    const findBy = (key: string) =>
      (createdSections.find((s) => s.section_key === key)!.body as { items: Finding[] }).items;
    expect(findBy("pages_losing_clicks").map((f) => f.title)).toEqual(["loss A"]);
    expect(findBy("ctr_opportunities").map((f) => f.title)).toEqual(["ctr B"]);
    expect(findBy("near_win_keywords").map((f) => f.title)).toEqual(["near C"]);
    expect(findBy("content_decay").map((f) => f.title)).toEqual(["decay D"]);
    expect(findBy("ga4_mismatch").map((f) => f.title)).toEqual(["ga4 E"]);
    expect(findBy("cannibalization").map((f) => f.title)).toEqual(["cannib F"]);
    expect(findBy("internal_links").map((f) => f.title)).toEqual(["il G"]);
    expect(findBy("previous_actions").map((f) => f.title)).toEqual(["followup H"]);

    // Cross-category aggregates
    expect(findBy("urgent_risks").length).toBe(2); // pages_losing_clicks + ga4_engagement_mismatch
    expect(findBy("growth_opportunities").length).toBe(3); // ctr + near-win + internal-link
    // action_list is the top-10 across everything
    expect(findBy("action_list").length).toBe(8);
    // watchlist is P2 + P3
    expect(findBy("next_week_watchlist").length).toBeGreaterThan(0);
  });

  it("produces a helpful executive summary when zero findings are returned", async () => {
    let createdReport: Record<string, unknown> | null = null;
    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      analysis_runs: { select: () => ({ data: RUN, error: null }) },
      findings: { select: () => ({ data: [], error: null }) },
      reports: {
        insert: (chain) => {
          const ins = chain.find((c) => c.method === "insert");
          createdReport = ins?.args[0] as Record<string, unknown>;
          return { data: { id: "report-empty", ...(createdReport ?? {}) }, error: null };
        },
      },
      report_sections: { insert: () => ({ error: null }) },
    });
    activeClient = client;

    const { reportId } = await buildReportFromRun({ siteId: TEST_SITE.id, analysisRunId: "run-1" });
    expect(reportId).toBe("report-empty");
    expect(createdReport!.executive_summary).toMatch(/No findings surfaced/);
    // Should NOT promise traffic or rankings
    expect(createdReport!.executive_summary).not.toMatch(/guarantee|will increase|will grow/i);
  });

  it("throws clearly when the analysis run cannot be found", async () => {
    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: TEST_SITE, error: null }) },
      analysis_runs: { select: () => ({ data: null, error: null }) },
    });
    activeClient = client;
    await expect(
      buildReportFromRun({ siteId: TEST_SITE.id, analysisRunId: "run-missing" }),
    ).rejects.toThrow(/Analysis run not found/);
  });

  it("throws clearly when the site cannot be found", async () => {
    const { client } = makeSupabaseMock({
      sites: { select: () => ({ data: null, error: null }) },
    });
    activeClient = client;
    await expect(
      buildReportFromRun({ siteId: "site-missing", analysisRunId: "run-1" }),
    ).rejects.toThrow(/Site not found/);
  });
});
