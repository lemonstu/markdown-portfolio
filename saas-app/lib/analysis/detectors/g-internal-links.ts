import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput, GscPageMetric } from "@/lib/types/domain";

/**
 * Detector G — Internal-link opportunities.
 *
 * Phase 1 deterministic logic (no LLM, no scraping):
 *   1. Identify "strong" pages — clicks >= site's 60th percentile clicks last period.
 *   2. Identify "opportunity" pages — positions 4–12 with low clicks but real impressions.
 *   3. Suggest at most one strong → opportunity pairing per opportunity page,
 *      using the strong page with the highest clicks that is not the opportunity itself.
 *
 * We never claim "topical relevance" because we have no on-page content to verify it.
 * The recommendation tells the user to validate relevance before adding the link.
 */
export function detectInternalLinkOpportunities(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.internalLinks;
  if (input.gscPagesCurrent.length < 3) return [];

  const sortedByClicks: GscPageMetric[] = [...input.gscPagesCurrent].sort((a, b) => b.clicks - a.clicks);
  const cutoffIndex = Math.floor(sortedByClicks.length * (1 - t.strongPagePercentile));
  const strongPages = sortedByClicks.slice(0, Math.max(1, cutoffIndex + 1));

  const opportunities = input.gscPagesCurrent.filter(
    (p) =>
      p.impressions >= t.opportunityMinImpressions &&
      p.avg_position >= t.opportunityMinPosition &&
      p.avg_position <= t.opportunityMaxPosition,
  );

  const findings: DetectorFinding[] = [];
  let count = 0;

  for (const opp of opportunities) {
    if (count >= t.maxSuggestions) break;
    const source = strongPages.find((s) => s.page_path !== opp.page_path);
    if (!source) continue;

    findings.push({
      finding_type: "internal_link_opportunity",
      page_path: opp.page_path,
      query: null,
      title: `Add internal link from ${source.page_path} → ${opp.page_path}`,
      evidence: {
        source_page: source.page_path,
        source_clicks: source.clicks,
        target_page: opp.page_path,
        target_position: opp.avg_position,
        target_impressions: opp.impressions,
        period: [input.currentPeriodStart, input.currentPeriodEnd],
      },
      why_it_matters: "The source page is one of the site's strongest pages by clicks. Routing internal authority to a near-win page often nudges its ranking up.",
      recommended_action: `Before adding the link, verify the source page genuinely covers the topic of the target. If it does, add a descriptive in-body link with anchor text that matches the target page's primary query.`,
      impact_score: 3,
      effort_score: 1,
      confidence: "low",
      source_dataset: "gsc_page_metrics",
    });
    count++;
  }

  return findings;
}
