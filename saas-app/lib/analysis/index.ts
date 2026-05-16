import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreFinding } from "@/lib/scoring/priority";
import type {
  ActionItem,
  AnalysisRun,
  DetectorInput,
  Finding,
  Site,
} from "@/lib/types/domain";

import { detectPagesLosingClicks } from "./detectors/a-pages-losing-clicks";
import { detectRisingImpressionsLowCtr } from "./detectors/b-rising-impressions-low-ctr";
import { detectNearWinKeywords } from "./detectors/c-near-win-keywords";
import { detectContentDecay } from "./detectors/d-content-decay";
import { detectGa4Mismatch } from "./detectors/e-ga4-mismatch";
import { detectCannibalization } from "./detectors/f-cannibalization";
import { detectInternalLinkOpportunities } from "./detectors/g-internal-links";
import { detectPreviousActionFollowup } from "./detectors/h-previous-action-followup";

export interface RunAnalysisArgs {
  siteId: string;
}

export interface RunAnalysisResult {
  run: AnalysisRun;
  findingsCreated: number;
}

/**
 * End-to-end Phase 1 analysis:
 *   1. Resolve the site and its most recent two GSC periods.
 *   2. Load metrics + previously completed actions.
 *   3. Run every detector.
 *   4. Score each detector finding into a priority + explanation.
 *   5. Insert an analysis_run + findings rows in the database.
 *
 * All reads/writes go through the user-scoped Supabase server client, so
 * RLS is enforced — a user can only run analysis on a site they belong to.
 */
export async function runAnalysisForSite({ siteId }: RunAnalysisArgs): Promise<RunAnalysisResult> {
  const supabase = await createSupabaseServerClient();

  // 1. Resolve site
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .single();
  if (siteErr || !site) throw new Error(`Site not found: ${siteErr?.message ?? siteId}`);

  // 2. Resolve the most recent two non-overlapping GSC periods present in storage.
  const { data: periodRows } = await supabase
    .from("gsc_page_metrics")
    .select("period_start, period_end")
    .eq("site_id", siteId)
    .order("period_end", { ascending: false })
    .limit(200);
  if (!periodRows || periodRows.length === 0) {
    throw new Error("No GSC data for this site. Run the demo seed or connect a data source.");
  }
  const uniquePeriods = dedupePeriods(periodRows);
  if (uniquePeriods.length < 2) {
    throw new Error("Need at least two GSC periods to compare. Demo seed provides this.");
  }
  const [current, prior] = uniquePeriods;

  // 3. Create an analysis_run row (running)
  const { data: runRow, error: runErr } = await supabase
    .from("analysis_runs")
    .insert({
      site_id: siteId,
      status: "running",
      current_period_start: current!.period_start,
      current_period_end: current!.period_end,
      prior_period_start: prior!.period_start,
      prior_period_end: prior!.period_end,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (runErr || !runRow) throw new Error(`Could not start analysis run: ${runErr?.message ?? "unknown"}`);

  try {
    const detectorInput = await loadDetectorInput(supabase, site as Site, current!, prior!);

    // 4. Run detectors
    const rawFindings = [
      ...detectPagesLosingClicks(detectorInput),
      ...detectRisingImpressionsLowCtr(detectorInput),
      ...detectNearWinKeywords(detectorInput),
      ...detectContentDecay(detectorInput),
      ...detectGa4Mismatch(detectorInput),
      ...detectCannibalization(detectorInput),
      ...detectInternalLinkOpportunities(detectorInput),
      ...detectPreviousActionFollowup(detectorInput),
    ];

    // 5. Score + persist
    const rows = rawFindings.map((f) => {
      const scored = scoreFinding(f);
      return {
        site_id: siteId,
        analysis_run_id: runRow.id,
        finding_type: f.finding_type,
        page_path: f.page_path,
        query: f.query,
        title: f.title,
        evidence: f.evidence,
        why_it_matters: f.why_it_matters,
        recommended_action: f.recommended_action,
        priority: scored.priority,
        priority_score: scored.priority_score,
        impact_score: f.impact_score,
        effort_score: f.effort_score,
        confidence: f.confidence,
        score_explanation: scored.score_explanation,
        source_dataset: f.source_dataset,
        date_range_start: current!.period_start,
        date_range_end: current!.period_end,
        status: "new" as const,
      };
    });

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("findings").insert(rows);
      if (insErr) throw new Error(`Failed to insert findings: ${insErr.message}`);
    }

    const { data: doneRun, error: doneErr } = await supabase
      .from("analysis_runs")
      .update({
        status: "completed",
        findings_count: rows.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id)
      .select("*")
      .single();
    if (doneErr || !doneRun) throw new Error(`Could not finalize run: ${doneErr?.message ?? "unknown"}`);

    return { run: doneRun as AnalysisRun, findingsCreated: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown analysis error";
    await supabase
      .from("analysis_runs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);
    throw err;
  }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

type PeriodLike = { period_start: string; period_end: string };

function dedupePeriods(rows: PeriodLike[]): PeriodLike[] {
  const seen = new Set<string>();
  const out: PeriodLike[] = [];
  for (const r of rows) {
    const key = `${r.period_start}::${r.period_end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= 2) break;
  }
  return out;
}

async function loadDetectorInput(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  site: Site,
  current: PeriodLike,
  prior: PeriodLike,
): Promise<DetectorInput> {
  const [
    { data: gscPagesCurrent },
    { data: gscPagesPrior },
    { data: gscQueriesCurrent },
    { data: gscQueriesPrior },
    { data: gscPageQueriesCurrent },
    { data: ga4LandingPages },
    { data: previousCompletedActions },
  ] = await Promise.all([
    supabase.from("gsc_page_metrics").select("*").eq("site_id", site.id).eq("period_start", current.period_start).eq("period_end", current.period_end),
    supabase.from("gsc_page_metrics").select("*").eq("site_id", site.id).eq("period_start", prior.period_start).eq("period_end", prior.period_end),
    supabase.from("gsc_query_metrics").select("*").eq("site_id", site.id).eq("period_start", current.period_start).eq("period_end", current.period_end),
    supabase.from("gsc_query_metrics").select("*").eq("site_id", site.id).eq("period_start", prior.period_start).eq("period_end", prior.period_end),
    supabase.from("gsc_page_query_metrics").select("*").eq("site_id", site.id).eq("period_start", current.period_start).eq("period_end", current.period_end),
    supabase.from("ga4_landing_page_metrics").select("*").eq("site_id", site.id).order("period_end", { ascending: false }).limit(50),
    supabase.from("action_items").select("*").eq("site_id", site.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(20),
  ]);

  return {
    site,
    currentPeriodStart: current.period_start,
    currentPeriodEnd: current.period_end,
    priorPeriodStart: prior.period_start,
    priorPeriodEnd: prior.period_end,
    gscPagesCurrent: gscPagesCurrent ?? [],
    gscPagesPrior: gscPagesPrior ?? [],
    gscQueriesCurrent: gscQueriesCurrent ?? [],
    gscQueriesPrior: gscQueriesPrior ?? [],
    gscPageQueriesCurrent: gscPageQueriesCurrent ?? [],
    ga4LandingPages: ga4LandingPages ?? [],
    previousCompletedActions: (previousCompletedActions ?? []) as ActionItem[],
  };
}

// Re-export for the report builder
export type { Finding };
