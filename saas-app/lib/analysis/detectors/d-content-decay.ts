import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector D — Content decay.
 * Pages that had meaningful clicks last period AND show declining clicks,
 * impressions OR position now.
 */
export function detectContentDecay(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.decay;
  const priorByPath = new Map(input.gscPagesPrior.map((p) => [p.page_path, p]));
  const findings: DetectorFinding[] = [];

  for (const curr of input.gscPagesCurrent) {
    const prior = priorByPath.get(curr.page_path);
    if (!prior) continue;
    if (prior.clicks < t.minPriorClicks) continue;

    const clicksRatio = prior.clicks === 0 ? 1 : curr.clicks / prior.clicks;
    const impressionsRatio = prior.impressions === 0 ? 1 : curr.impressions / prior.impressions;

    // Decay signal: clicks declined AND (impressions also down OR position worsened)
    if (clicksRatio > t.declineRatio) continue;
    const impressionsDeclining = impressionsRatio < 0.95;
    const positionWorsened = curr.avg_position > prior.avg_position + 0.5;
    if (!impressionsDeclining && !positionWorsened) continue;

    const pctChange = Math.round(((curr.clicks - prior.clicks) / prior.clicks) * 100);
    findings.push({
      finding_type: "content_decay",
      page_path: curr.page_path,
      query: null,
      title: `${curr.page_path} shows decay signal (${pctChange}% clicks vs prior period)`,
      evidence: {
        prior_clicks: prior.clicks,
        current_clicks: curr.clicks,
        prior_impressions: prior.impressions,
        current_impressions: curr.impressions,
        prior_position: prior.avg_position,
        current_position: curr.avg_position,
        period_current: [input.currentPeriodStart, input.currentPeriodEnd],
        period_prior: [input.priorPeriodStart, input.priorPeriodEnd],
      },
      why_it_matters: "Decay on previously performing content compounds quietly. Catching it in its first sustained week is the cheapest time to act.",
      recommended_action: positionWorsened
        ? "Refresh content — update intro, dates, examples, and competitive references; verify no on-page regressions."
        : "Investigate whether demand or competition has shifted, then refresh or expand the page accordingly.",
      impact_score: 4,
      effort_score: 3,
      confidence: "medium",
      source_dataset: "gsc_page_metrics",
    });
  }

  return findings;
}
