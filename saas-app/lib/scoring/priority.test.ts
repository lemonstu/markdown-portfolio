import { describe, expect, it } from "vitest";
import { scoreFinding } from "./priority";
import type { DetectorFinding } from "@/lib/types/domain";

function base(overrides: Partial<DetectorFinding> = {}): DetectorFinding {
  return {
    finding_type: "pages_losing_clicks",
    page_path: "/x",
    query: null,
    title: "x",
    evidence: {},
    why_it_matters: "",
    recommended_action: "",
    impact_score: 3,
    effort_score: 3,
    confidence: "medium",
    source_dataset: "gsc_page_metrics",
    ...overrides,
  };
}

describe("scoreFinding", () => {
  it("assigns P1 to high-impact, high-confidence, low-effort, urgent detectors", () => {
    const out = scoreFinding(
      base({
        finding_type: "pages_losing_clicks",
        impact_score: 5,
        effort_score: 1,
        confidence: "high",
      }),
    );
    expect(out.priority).toBe("p1");
    expect(out.priority_score).toBeGreaterThanOrEqual(75);
    expect(out.score_explanation).toMatch(/High priority/);
  });

  it("assigns P3 to low-impact, low-confidence, low-urgency detectors", () => {
    const out = scoreFinding(
      base({
        finding_type: "internal_link_opportunity",
        impact_score: 2,
        effort_score: 4,
        confidence: "low",
      }),
    );
    expect(out.priority).toBe("p3");
    expect(out.priority_score).toBeLessThan(55);
  });

  it("never returns a score above 100 or below 0", () => {
    for (const impact of [1, 3, 5]) {
      for (const effort of [1, 3, 5]) {
        for (const confidence of ["low", "medium", "high"] as const) {
          const out = scoreFinding(base({ impact_score: impact, effort_score: effort, confidence }));
          expect(out.priority_score).toBeGreaterThanOrEqual(0);
          expect(out.priority_score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("explanation names the dominant factor", () => {
    const highImpact = scoreFinding(base({ impact_score: 5, effort_score: 5, confidence: "low" }));
    expect(highImpact.score_explanation).toMatch(/high impact/);
  });
});
