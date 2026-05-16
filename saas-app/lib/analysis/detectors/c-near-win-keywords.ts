import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector C — Queries stuck in positions 4–20 with meaningful impressions.
 */
export function detectNearWinKeywords(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.nearWin;
  const findings: DetectorFinding[] = [];

  for (const q of input.gscQueriesCurrent) {
    if (q.impressions < t.minImpressions) continue;
    if (q.avg_position < t.minPosition || q.avg_position > t.maxPosition) continue;

    const targetPosition = Math.max(1, Math.floor(q.avg_position) - 3);

    findings.push({
      finding_type: "near_win_keywords",
      page_path: null,
      query: q.query,
      title: `"${q.query}" ranks position ${q.avg_position.toFixed(1)} (${q.impressions.toLocaleString()} imp/wk)`,
      evidence: {
        query: q.query,
        impressions: q.impressions,
        clicks: q.clicks,
        position: q.avg_position,
        target_position: targetPosition,
        period: [input.currentPeriodStart, input.currentPeriodEnd],
      },
      why_it_matters: "Positions 4–20 are the highest-leverage SEO zone: small content or linking moves can lift rank into the top-CTR positions.",
      recommended_action: `Identify the page targeting this query and add a focused section answering the dominant subtopic; reinforce with 1–2 internal links from a strong topical page.`,
      impact_score: q.impressions >= 1500 ? 5 : q.impressions >= 700 ? 4 : 3,
      effort_score: 3,
      confidence: q.impressions >= 700 ? "high" : "medium",
      source_dataset: "gsc_query_metrics",
    });
  }

  return findings;
}
