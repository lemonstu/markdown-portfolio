import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector F — Cannibalization risk.
 * Same query ranks two or more pages from the same site within the top 30,
 * with meaningful impressions on the secondary URL.
 */
export function detectCannibalization(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.cannibalization;
  const findings: DetectorFinding[] = [];

  // Group page-query rows by query
  const byQuery = new Map<string, typeof input.gscPageQueriesCurrent>();
  for (const row of input.gscPageQueriesCurrent) {
    const list = byQuery.get(row.query) ?? [];
    list.push(row);
    byQuery.set(row.query, list);
  }

  for (const [query, rows] of byQuery) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort((a, b) => a.avg_position - b.avg_position);
    const dominant = sorted[0]!;
    const secondary = sorted[1]!;
    if (secondary.impressions < t.minSecondaryImpressions) continue;
    if (secondary.avg_position > t.maxSecondaryPosition) continue;

    findings.push({
      finding_type: "cannibalization_risk",
      page_path: secondary.page_path,
      query,
      title: `"${query}" ranks two URLs: ${dominant.page_path} and ${secondary.page_path}`,
      evidence: {
        query,
        dominant_url: dominant.page_path,
        dominant_position: dominant.avg_position,
        dominant_impressions: dominant.impressions,
        secondary_url: secondary.page_path,
        secondary_position: secondary.avg_position,
        secondary_impressions: secondary.impressions,
        period: [input.currentPeriodStart, input.currentPeriodEnd],
      },
      why_it_matters: "Two URLs competing for the same query dilutes ranking signals. Clarifying intent — or consolidating — usually lifts the dominant URL.",
      recommended_action: `Decide whether ${dominant.page_path} or ${secondary.page_path} should own this query. Update on-page targeting and internal anchors; redirect or differentiate intent on the loser.`,
      impact_score: 3,
      effort_score: 3,
      confidence: "medium",
      source_dataset: "gsc_page_query_metrics",
    });
  }

  return findings;
}
