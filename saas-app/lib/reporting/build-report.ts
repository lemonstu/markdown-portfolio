import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Finding, FindingType, Site } from "@/lib/types/domain";

export interface BuildReportArgs {
  siteId: string;
  analysisRunId: string;
}

export interface BuildReportResult {
  reportId: string;
}

const SECTION_DEFINITIONS: Array<{
  key: string;
  title: string;
  types: FindingType[] | "executive" | "watchlist";
}> = [
  { key: "executive_summary", title: "Executive summary", types: "executive" },
  { key: "urgent_risks", title: "Top urgent SEO risks", types: ["pages_losing_clicks", "ga4_engagement_mismatch"] },
  { key: "growth_opportunities", title: "Top growth opportunities", types: ["rising_impressions_low_ctr", "near_win_keywords", "internal_link_opportunity"] },
  { key: "pages_losing_clicks", title: "Pages losing clicks", types: ["pages_losing_clicks"] },
  { key: "ctr_opportunities", title: "Pages with rising impressions but weak CTR", types: ["rising_impressions_low_ctr"] },
  { key: "near_win_keywords", title: "Keywords stuck in positions 4–20", types: ["near_win_keywords"] },
  { key: "content_decay", title: "Content decay opportunities", types: ["content_decay"] },
  { key: "cannibalization", title: "Cannibalization risks", types: ["cannibalization_risk"] },
  { key: "internal_links", title: "Internal-link recommendations", types: ["internal_link_opportunity"] },
  { key: "ga4_mismatch", title: "GA4 engagement / conversion mismatch", types: ["ga4_engagement_mismatch"] },
  { key: "previous_actions", title: "Previous action follow-up", types: ["previous_action_followup"] },
  { key: "action_list", title: "This week's prioritized action list", types: "executive" }, // synthesized
  { key: "next_week_watchlist", title: "Next-week watchlist", types: "watchlist" },
];

export async function buildReportFromRun({ siteId, analysisRunId }: BuildReportArgs): Promise<BuildReportResult> {
  const supabase = await createSupabaseServerClient();

  const { data: site } = await supabase.from("sites").select("*").eq("id", siteId).single();
  if (!site) throw new Error("Site not found");

  const { data: run } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("id", analysisRunId)
    .single();
  if (!run) throw new Error("Analysis run not found");

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .eq("analysis_run_id", analysisRunId)
    .order("priority_score", { ascending: false });

  const all = (findings ?? []) as Finding[];

  const periodStart = run.current_period_start;
  const periodEnd = run.current_period_end;

  const execSummary = buildExecutiveSummary(site as Site, all, periodStart, periodEnd);

  const { data: reportRow, error: reportErr } = await supabase
    .from("reports")
    .insert({
      site_id: siteId,
      analysis_run_id: analysisRunId,
      title: `Weekly Organic Growth Brief — ${(site as Site).name} — ${periodStart} → ${periodEnd}`,
      period_start: periodStart,
      period_end: periodEnd,
      executive_summary: execSummary,
    })
    .select("*")
    .single();
  if (reportErr || !reportRow) throw new Error(`Could not create report: ${reportErr?.message ?? "unknown"}`);

  // Build sections from findings
  const sectionRows = SECTION_DEFINITIONS.map((def, index) => {
    let items: Finding[] = [];
    if (def.types === "executive") {
      items = def.key === "action_list" ? all.slice(0, 10) : [];
    } else if (def.types === "watchlist") {
      items = all.filter((f) => f.priority === "p2" || f.priority === "p3").slice(0, 5);
    } else {
      items = all.filter((f) => def.types.includes(f.finding_type));
    }
    return {
      report_id: reportRow.id,
      section_key: def.key,
      title: def.title,
      body: { items },
      sort_order: index,
    };
  });

  if (sectionRows.length > 0) {
    const { error: secErr } = await supabase.from("report_sections").insert(sectionRows);
    if (secErr) throw new Error(`Could not insert report sections: ${secErr.message}`);
  }

  return { reportId: reportRow.id };
}

function buildExecutiveSummary(site: Site, findings: Finding[], periodStart: string, periodEnd: string): string {
  if (findings.length === 0) {
    return `No findings surfaced for ${site.name} between ${periodStart} and ${periodEnd}. Data thresholds may not have been met; verify the site has sufficient traffic and that the period has comparable prior-period data.`;
  }

  const p1 = findings.filter((f) => f.priority === "p1").length;
  const p2 = findings.filter((f) => f.priority === "p2").length;
  const losing = findings.filter((f) => f.finding_type === "pages_losing_clicks").slice(0, 1)[0];
  const opp = findings.find((f) => f.finding_type === "rising_impressions_low_ctr" || f.finding_type === "near_win_keywords");

  const sentences: string[] = [];
  sentences.push(
    `Brief for ${site.name} covering ${periodStart} → ${periodEnd}: ${findings.length} findings surfaced (${p1} P1, ${p2} P2).`,
  );
  if (losing) {
    sentences.push(
      `Top risk: ${losing.title}. ${losing.recommended_action}`,
    );
  }
  if (opp) {
    sentences.push(`Top opportunity: ${opp.title}.`);
  }
  sentences.push(
    `Full prioritized action list is at the end of the brief; each item carries impact, effort, and confidence scoring with a one-line explanation.`,
  );
  return sentences.join(" ");
}
