// Central place for all detector thresholds.
// Editing these here lets you re-tune sensitivity without touching detector logic.

export const THRESHOLDS = {
  // Detector A — pages losing clicks
  trafficDrop: {
    minPriorClicks: 100,
    relativeDropRatio: 0.7, // recent <= 70% of prior
    minAbsoluteDelta: 30,
    severeDropRatio: 0.5, // <= 50% of prior → P1
  },

  // Detector B — rising impressions / low CTR
  ctrOpportunity: {
    minImpressions: 500,
    minPosition: 3,
    maxPosition: 15,
    ctrGapMultiple: 0.5, // observed CTR <= 50% of expected
  },

  // Detector C — near-win keywords (positions 4–20)
  nearWin: {
    minImpressions: 100,
    minPosition: 4,
    maxPosition: 20,
  },

  // Detector D — content decay (period-over-period sustained)
  decay: {
    minPriorClicks: 80,
    declineRatio: 0.8, // recent clicks <= 80% of prior
    impressionsAlsoDeclining: true,
  },

  // Detector E — GA4 engagement/conversion mismatch
  ga4Mismatch: {
    minSessions: 200,
    highEngagementRate: 0.65,
    lowKeyEventsRate: 0.02, // key_events / sessions
    zeroEventsFlag: 0, // explicit zero → measurement problem
  },

  // Detector F — cannibalization
  cannibalization: {
    minSecondaryImpressions: 50,
    maxSecondaryPosition: 30,
  },

  // Detector G — internal-link opportunity
  internalLinks: {
    // a "strong" page has clicks above the site's 60th percentile clicks last period
    strongPagePercentile: 0.6,
    // an "opportunity" page is a near-win (positions 4-12 with low clicks)
    opportunityMinImpressions: 300,
    opportunityMinPosition: 4,
    opportunityMaxPosition: 12,
    maxSuggestions: 5,
  },
} as const;

// Site-agnostic conservative CTR curve. When ≥3 months of data is available we
// build a per-site curve; for Phase 1 the demo data uses this default.
// Source: industry observation, tuned conservatively. Tweak as needed.
export const DEFAULT_CTR_CURVE: Record<number, number> = {
  1: 0.295,
  2: 0.155,
  3: 0.097,
  4: 0.067,
  5: 0.052,
  6: 0.042,
  7: 0.034,
  8: 0.028,
  9: 0.024,
  10: 0.021,
  11: 0.018,
  12: 0.016,
  13: 0.014,
  14: 0.012,
  15: 0.011,
  16: 0.010,
  17: 0.009,
  18: 0.008,
  19: 0.0075,
  20: 0.007,
};

export function expectedCtrAtPosition(position: number): number {
  const rounded = Math.max(1, Math.min(20, Math.round(position)));
  return DEFAULT_CTR_CURVE[rounded] ?? 0.005;
}
