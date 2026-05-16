import { THRESHOLDS } from "@/lib/analysis/thresholds";
import type { DetectorFinding, DetectorInput } from "@/lib/types/domain";

/**
 * Detector E — GA4 engagement / conversion mismatch.
 * Pages with high engagement but zero or very few key events
 * (likely measurement break, intent mismatch, or CTA placement).
 */
export function detectGa4Mismatch(input: DetectorInput): DetectorFinding[] {
  const t = THRESHOLDS.ga4Mismatch;
  const findings: DetectorFinding[] = [];

  for (const lp of input.ga4LandingPages) {
    if (lp.sessions < t.minSessions) continue;

    const eventsPerSession = lp.sessions === 0 ? 0 : lp.key_events / lp.sessions;

    // Zero key events with otherwise healthy engagement → measurement risk
    if (lp.engagement_rate >= t.highEngagementRate && lp.key_events === t.zeroEventsFlag) {
      findings.push({
        finding_type: "ga4_engagement_mismatch",
        page_path: lp.page_path,
        query: null,
        title: `${lp.page_path}: ${lp.sessions} sessions, ${(lp.engagement_rate * 100).toFixed(0)}% engagement, 0 key events`,
        evidence: {
          sessions: lp.sessions,
          engaged_sessions: lp.engaged_sessions,
          engagement_rate: lp.engagement_rate,
          key_events: lp.key_events,
          period: [lp.period_start, lp.period_end],
        },
        why_it_matters: "Zero key events on a page with healthy engagement is almost always a measurement problem (event misfire, tag change). Downstream attribution is unreliable until verified.",
        recommended_action: "Verify the key event in GA4 DebugView; check for a tagging change in the recent deploy; flag as measurement issue (not content issue) until confirmed.",
        impact_score: 4,
        effort_score: 1,
        confidence: "high",
        source_dataset: "ga4_landing_page_metrics",
      });
      continue;
    }

    // Healthy engagement, weak conversion rate → placement / intent
    if (lp.engagement_rate >= t.highEngagementRate && eventsPerSession <= t.lowKeyEventsRate && lp.key_events > 0) {
      findings.push({
        finding_type: "ga4_engagement_mismatch",
        page_path: lp.page_path,
        query: null,
        title: `${lp.page_path}: high engagement, low conversion`,
        evidence: {
          sessions: lp.sessions,
          engagement_rate: lp.engagement_rate,
          key_events: lp.key_events,
          events_per_session: eventsPerSession,
          period: [lp.period_start, lp.period_end],
        },
        why_it_matters: "Readers find the page valuable but aren't converting. The bottleneck is usually CTA placement or intent mismatch — not content quality.",
        recommended_action: "Audit CTA placement (move above the fold or above key decision blocks); test secondary CTAs near the top picks; verify intent matches landing query.",
        impact_score: 3,
        effort_score: 2,
        confidence: "medium",
        source_dataset: "ga4_landing_page_metrics",
      });
    }
  }

  return findings;
}
