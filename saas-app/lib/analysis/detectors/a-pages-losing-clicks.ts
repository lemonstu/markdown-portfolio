import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector A — Pages losing clicks.
 * Flags pages where clicks dropped meaningfully vs the prior period.
 */
export function detectPagesLosingClicks(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.trafficDrop;
  const priorByPath = new Map(input.gscPagesPrior.map((p) => [p.page_path, p]));
  const findings: DetectorFinding[] = [];

  for (const curr of input.gscPagesCurrent) {
    const prior = priorByPath.get(curr.page_path);
    if (!prior) continue;
    if (prior.clicks < t.minPriorClicks) continue;

    const ratio = prior.clicks === 0 ? 1 : curr.clicks / prior.clicks;
    const absoluteDelta = prior.clicks - curr.clicks;
    if (ratio > t.relativeDropRatio) continue;
    if (absoluteDelta < t.minAbsoluteDelta) continue;

    const pctChange = Math.round(((curr.clicks - prior.clicks) / prior.clicks) * 100);
    const positionMoved = curr.avg_position - prior.avg_position;
    const impressionDelta = curr.impressions - prior.impressions;
    const impressionsRoughlyStable = Math.abs(impressionDelta) / Math.max(1, prior.impressions) < 0.1;

    let likelyCause = "Investigate cause: ranking drop, CTR drop, indexation, or seasonal.";
    if (positionMoved >= 1.5) likelyCause = `Avg position dropped from ${prior.avg_position.toFixed(1)} to ${curr.avg_position.toFixed(1)} — likely ranking loss on primary query.`;
    else if (impressionsRoughlyStable && curr.ctr < prior.ctr * 0.85) likelyCause = "Impressions stable but CTR fell — likely a SERP/CTR issue (title, snippet, or new SERP feature).";

    const severe = ratio <= t.severeDropRatio;

    findings.push({
      finding_type: "pages_losing_clicks",
      page_path: curr.page_path,
      query: null,
      title: `${curr.page_path} lost ${Math.abs(pctChange)}% of clicks week-over-week`,
      evidence: {
        prior_clicks: prior.clicks,
        current_clicks: curr.clicks,
        pct_change: pctChange,
        prior_position: prior.avg_position,
        current_position: curr.avg_position,
        prior_impressions: prior.impressions,
        current_impressions: curr.impressions,
        period_current: [input.currentPeriodStart, input.currentPeriodEnd],
        period_prior: [input.priorPeriodStart, input.priorPeriodEnd],
      },
      why_it_matters: severe
        ? "Severe click loss on a top-volume page directly hits weekly traffic and dependent revenue. Acting this week limits compounding loss."
        : "Sustained click loss on a meaningful page erodes the site's organic baseline. Worth diagnosing now before it compounds.",
      recommended_action: likelyCause,
      impact_score: severe ? 5 : 4,
      effort_score: 2,
      confidence: severe ? "high" : "medium",
      source_dataset: "gsc_page_metrics",
    });
  }

  return findings;
}
