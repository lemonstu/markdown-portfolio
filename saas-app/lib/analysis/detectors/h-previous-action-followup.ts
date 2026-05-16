import type { DetectorFinding, DetectorInput, GscPageMetric } from "@/lib/types/domain";

/**
 * Detector H — Previous action follow-up.
 * Looks at recently completed action items and reports observed metric
 * movement on any referenced page since completion.
 *
 * For Phase 1 we use simple substring matching between the action title /
 * description and the GSC page paths (the demo seed places a recognizable
 * path in the action title). Phase 2 should link actions to specific pages.
 */
export function detectPreviousActionFollowup(input: DetectorInput): DetectorFinding[] {
  const findings: DetectorFinding[] = [];
  const priorByPath = new Map(input.gscPagesPrior.map((p) => [p.page_path, p]));

  for (const action of input.previousCompletedActions) {
    const matchedPath = findPageInText(`${action.title} ${action.description ?? ""}`, input.gscPagesCurrent);
    if (!matchedPath) continue;
    const curr = input.gscPagesCurrent.find((p) => p.page_path === matchedPath);
    const prior = priorByPath.get(matchedPath);
    if (!curr || !prior) continue;

    const clicksDelta = curr.clicks - prior.clicks;
    const ctrDelta = curr.ctr - prior.ctr;
    const direction =
      clicksDelta > 0 && ctrDelta > 0
        ? "improvement"
        : clicksDelta < 0 || ctrDelta < 0
        ? "no improvement yet"
        : "neutral";

    const status =
      direction === "improvement"
        ? "Positive movement observed."
        : direction === "no improvement yet"
        ? "Too early or no positive signal yet — re-check next week."
        : "No meaningful change yet.";

    findings.push({
      finding_type: "previous_action_followup",
      page_path: matchedPath,
      query: null,
      title: `Follow-up: ${action.title}`,
      evidence: {
        action_id: action.id,
        action_completed_at: action.completed_at,
        page: matchedPath,
        prior_clicks: prior.clicks,
        current_clicks: curr.clicks,
        prior_ctr: prior.ctr,
        current_ctr: curr.ctr,
        prior_position: prior.avg_position,
        current_position: curr.avg_position,
      },
      why_it_matters: "Tracking completed actions is what separates a real analyst layer from a generic dashboard. It also calibrates next week's recommendations.",
      recommended_action: status,
      impact_score: 2,
      effort_score: 1,
      confidence: "high",
      source_dataset: "action_items + gsc_page_metrics",
    });
  }

  return findings;
}

function findPageInText(text: string, pages: GscPageMetric[]): string | null {
  for (const p of pages) {
    if (text.includes(p.page_path)) return p.page_path;
  }
  return null;
}
