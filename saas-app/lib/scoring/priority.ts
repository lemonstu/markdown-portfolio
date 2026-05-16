import type {
  ConfidenceLevel,
  DetectorFinding,
  FindingType,
  PriorityBucket,
} from "@/lib/types/domain";

/**
 * Explainable priority score.
 *
 * priority_score is a 0–100 number derived from:
 *   - impact_score (1-5)            weighted 0.45
 *   - confidence_multiplier (0-1)   weighted 0.20
 *   - effort_inverse (1-5 inverted) weighted 0.20
 *   - urgency_multiplier (0-1)      weighted 0.15
 *
 * The bucket (P1/P2/P3) maps from priority_score thresholds.
 * Every finding gets a short, human-readable `score_explanation` describing
 * the dominant factor — never a black-box number.
 */
export interface ScoredPriority {
  priority: PriorityBucket;
  priority_score: number;
  score_explanation: string;
}

const CONFIDENCE_MULT: Record<ConfidenceLevel, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

// Urgency multiplier by detector type — represents "do this week vs. eventually"
const URGENCY_BY_TYPE: Record<FindingType, number> = {
  pages_losing_clicks: 1.0,
  rising_impressions_low_ctr: 0.85,
  content_decay: 0.7,
  ga4_engagement_mismatch: 0.9,
  cannibalization_risk: 0.7,
  near_win_keywords: 0.6,
  internal_link_opportunity: 0.5,
  previous_action_followup: 0.4,
};

export function scoreFinding(detector: DetectorFinding): ScoredPriority {
  const impactNorm = detector.impact_score / 5;
  const effortInverseNorm = (6 - detector.effort_score) / 5;
  const confidenceMult = CONFIDENCE_MULT[detector.confidence];
  const urgencyMult = URGENCY_BY_TYPE[detector.finding_type] ?? 0.7;

  const raw =
    impactNorm * 0.45 +
    confidenceMult * 0.2 +
    effortInverseNorm * 0.2 +
    urgencyMult * 0.15;

  const priority_score = Math.round(raw * 100);

  let priority: PriorityBucket = "p3";
  if (priority_score >= 75) priority = "p1";
  else if (priority_score >= 55) priority = "p2";

  // Build a one-sentence explanation that names the dominant driver.
  const contributions: Array<{ label: string; value: number }> = [
    { label: `high impact (${detector.impact_score}/5)`, value: impactNorm * 0.45 },
    { label: `${detector.confidence} confidence`, value: confidenceMult * 0.2 },
    { label: `low effort (${detector.effort_score}/5)`, value: effortInverseNorm * 0.2 },
    { label: detectorUrgencyLabel(detector.finding_type), value: urgencyMult * 0.15 },
  ];
  contributions.sort((a, b) => b.value - a.value);
  const driver = contributions[0]!.label;
  const second = contributions[1]!.label;

  const score_explanation = priorityExplanation({
    detector,
    priority,
    driver,
    second,
  });

  return { priority, priority_score, score_explanation };
}

function detectorUrgencyLabel(type: FindingType): string {
  switch (type) {
    case "pages_losing_clicks":
      return "urgent (active click loss)";
    case "ga4_engagement_mismatch":
      return "urgent (measurement / conversion risk)";
    case "rising_impressions_low_ctr":
      return "near-term win (CTR fix)";
    case "cannibalization_risk":
      return "structural risk";
    case "content_decay":
      return "decay watch";
    case "near_win_keywords":
      return "leverage opportunity";
    case "internal_link_opportunity":
      return "quick on-site win";
    case "previous_action_followup":
      return "follow-up";
  }
}

function priorityExplanation(args: {
  detector: DetectorFinding;
  priority: PriorityBucket;
  driver: string;
  second: string;
}): string {
  const { detector, priority, driver, second } = args;
  const bucketWord = priority === "p1" ? "High" : priority === "p2" ? "Medium" : "Low";
  return `${bucketWord} priority — driven by ${driver}, supported by ${second}. Detector: ${humanType(
    detector.finding_type,
  )}.`;
}

function humanType(t: FindingType): string {
  return t.replaceAll("_", " ");
}
