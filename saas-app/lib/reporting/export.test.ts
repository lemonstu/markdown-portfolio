import { describe, expect, it } from "vitest";
import { reportToMarkdown, execSummaryEmail } from "./export";
import { TEST_SITE } from "@/lib/analysis/fixtures.test-util";
import type { Finding, Report, ReportSection } from "@/lib/types/domain";

function mkFinding(over: Partial<Finding> = {}): Finding {
  return {
    id: crypto.randomUUID(),
    site_id: TEST_SITE.id,
    analysis_run_id: "run-1",
    finding_type: "pages_losing_clicks",
    page_path: "/x",
    query: null,
    title: "Default finding",
    evidence: {},
    why_it_matters: "Why.",
    recommended_action: "Action.",
    priority: "p1",
    priority_score: 80,
    impact_score: 5,
    effort_score: 2,
    confidence: "high",
    score_explanation: "High priority — driven by high impact.",
    source_dataset: "gsc_page_metrics",
    date_range_start: "2026-05-06",
    date_range_end: "2026-05-12",
    status: "new",
    note: null,
    created_at: "2026-05-13T00:00:00Z",
    updated_at: "2026-05-13T00:00:00Z",
    ...over,
  };
}

const REPORT: Report = {
  id: "report-1",
  site_id: TEST_SITE.id,
  analysis_run_id: "run-1",
  title: "Weekly Organic Growth Brief — Test Site — 2026-05-06 → 2026-05-12",
  period_start: "2026-05-06",
  period_end: "2026-05-12",
  executive_summary: "Brief covering test period. 2 findings surfaced.",
  created_at: "2026-05-13T00:00:00Z",
};

function mkSection(key: string, title: string, items: Finding[], order: number): ReportSection {
  return {
    id: crypto.randomUUID(),
    report_id: REPORT.id,
    section_key: key,
    title,
    body: { items },
    sort_order: order,
  };
}

describe("reportToMarkdown", () => {
  it("renders the title, period, exec summary, and every non-exec section", () => {
    const sections: ReportSection[] = [
      mkSection("executive_summary", "Executive summary", [], 0),
      mkSection("urgent_risks", "Top urgent SEO risks", [mkFinding({ title: "Risk One" })], 1),
      mkSection("pages_losing_clicks", "Pages losing clicks", [mkFinding({ title: "Page Loss" })], 2),
      mkSection("ctr_opportunities", "Pages with rising impressions but weak CTR", [], 3),
    ];
    const md = reportToMarkdown({ site: TEST_SITE, report: REPORT, sections });
    expect(md).toContain(REPORT.title);
    expect(md).toContain("## Executive summary");
    expect(md).toContain(REPORT.executive_summary);
    expect(md).toContain("## Top urgent SEO risks");
    expect(md).toContain("### Risk One");
    expect(md).toContain("**Priority:** P1");
    expect(md).toContain("## Pages losing clicks");
    expect(md).toContain("### Page Loss");
    // Empty section gets the placeholder
    expect(md).toContain("_No findings in this section._");
    // Executive section is rendered once (from report.executive_summary) and not duplicated
    expect(md.match(/## Executive summary/g)).toHaveLength(1);
  });

  it("does not include any guaranteed-outcome language in default rendering", () => {
    const sections: ReportSection[] = [
      mkSection("executive_summary", "Executive summary", [], 0),
      mkSection(
        "urgent_risks",
        "Top urgent SEO risks",
        [mkFinding({ title: "loss", why_it_matters: "matters", recommended_action: "act" })],
        1,
      ),
    ];
    const md = reportToMarkdown({ site: TEST_SITE, report: REPORT, sections });
    expect(md).not.toMatch(/\bguarantee\b/i);
    expect(md).not.toMatch(/will increase by/i);
    expect(md).not.toMatch(/will rank/i);
    expect(md).not.toMatch(/10x/i);
  });
});

describe("execSummaryEmail", () => {
  it("includes subject, summary, and a numbered top-actions list", () => {
    const top = [
      mkFinding({ title: "Do thing one", priority: "p1", recommended_action: "Do A" }),
      mkFinding({ title: "Do thing two", priority: "p1", recommended_action: "Do B" }),
      mkFinding({ title: "Do thing three", priority: "p2", recommended_action: "Do C" }),
    ];
    const out = execSummaryEmail({ site: TEST_SITE, report: REPORT, topActions: top });
    expect(out.startsWith("Subject:")).toBe(true);
    expect(out).toContain(REPORT.executive_summary);
    expect(out).toContain("1. [P1] Do thing one — Do A");
    expect(out).toContain("2. [P1] Do thing two — Do B");
    expect(out).toContain("3. [P2] Do thing three — Do C");
  });

  it("caps the top-action list to 5 items", () => {
    const top = Array.from({ length: 8 }).map((_, i) => mkFinding({ title: `Action ${i + 1}` }));
    const out = execSummaryEmail({ site: TEST_SITE, report: REPORT, topActions: top });
    expect(out).toContain("5. [P1]");
    expect(out).not.toContain("6. [P1]");
  });

  it("handles zero top actions gracefully", () => {
    const out = execSummaryEmail({ site: TEST_SITE, report: REPORT, topActions: [] });
    expect(out).toContain("Top actions this week:");
    expect(out).toContain(REPORT.executive_summary);
  });
});
