import { THRESHOLDS, expectedCtrAtPosition } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector B — Rising impressions but weak CTR.
 * Flags pages whose observed CTR is well below the expected CTR at the current avg position.
 */
export function detectRisingImpressionsLowCtr(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.ctrOpportunity;
  const findings: DetectorFinding[] = [];

  for (const curr of input.gscPagesCurrent) {
    if (curr.impressions < t.minImpressions) continue;
    if (curr.avg_position < t.minPosition || curr.avg_position > t.maxPosition) continue;

    const expectedCtr = expectedCtrAtPosition(curr.avg_position);
    if (curr.ctr > expectedCtr * t.ctrGapMultiple) continue;

    const estLift = Math.round((expectedCtr - curr.ctr) * curr.impressions);
    if (estLift < 25) continue;

    findings.push({
      finding_type: "rising_impressions_low_ctr",
      page_path: curr.page_path,
      query: null,
      title: `${curr.page_path} has weak CTR at position ${curr.avg_position.toFixed(1)}`,
      evidence: {
        impressions: curr.impressions,
        observed_ctr: curr.ctr,
        expected_ctr_at_position: expectedCtr,
        position: curr.avg_position,
        estimated_weekly_lift_clicks: estLift,
        period: [input.currentPeriodStart, input.currentPeriodEnd],
      },
      why_it_matters: `Observed CTR (${(curr.ctr * 100).toFixed(2)}%) is well below the expected ${(expectedCtr * 100).toFixed(2)}% at this position. A title/meta rewrite is the highest-ROI weekly action.`,
      recommended_action: `Rewrite the title tag and meta description to better match the dominant query intent. Estimated weekly lift: +${estLift} clicks.`,
      impact_score: estLift >= 75 ? 5 : 4,
      effort_score: 1,
      confidence: "high",
      source_dataset: "gsc_page_metrics",
    });
  }

  return findings;
}
