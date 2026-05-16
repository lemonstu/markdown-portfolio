import { describe, expect, it } from "vitest";
import { detectInternalLinkOpportunities } from "./g-internal-links";
import { gscPage, makeInput } from "../fixtures.test-util";

describe("Detector G — internal-link opportunities", () => {
  it("suggests strong → near-win pairings", () => {
    const input = makeInput({
      gscPagesCurrent: [
        gscPage("/strong-1", "current", 800, 9000, 4),
        gscPage("/strong-2", "current", 600, 7000, 5),
        gscPage("/opp-1", "current", 30, 1500, 7),
        gscPage("/opp-2", "current", 25, 1200, 9),
        gscPage("/weak", "current", 10, 200, 25),
      ],
    });
    const findings = detectInternalLinkOpportunities(input);
    // 2 opportunity pages → 2 suggestions
    expect(findings.length).toBeGreaterThanOrEqual(2);
    // Should never suggest linking a page to itself
    findings.forEach((f) => {
      expect(f.evidence).not.toEqual(
        expect.objectContaining({ source_page: f.evidence.target_page }),
      );
    });
    // Source should be one of the strong pages
    findings.forEach((f) => {
      expect(["/strong-1", "/strong-2"]).toContain(f.evidence.source_page);
    });
  });

  it("returns nothing when there are no near-win opportunities", () => {
    const input = makeInput({
      gscPagesCurrent: [
        gscPage("/strong", "current", 800, 9000, 3),
        gscPage("/also-strong", "current", 600, 5000, 4),
      ],
    });
    expect(detectInternalLinkOpportunities(input)).toHaveLength(0);
  });

  it("caps suggestions to the configured max", () => {
    const pages = Array.from({ length: 12 }).map((_, i) =>
      gscPage(`/opp-${i}`, "current", 20, 500, 8),
    );
    pages.unshift(gscPage("/anchor", "current", 1000, 10000, 3));
    const findings = detectInternalLinkOpportunities(makeInput({ gscPagesCurrent: pages }));
    expect(findings.length).toBeLessThanOrEqual(5);
  });

  it("flags low confidence (because relevance is unverified)", () => {
    const input = makeInput({
      gscPagesCurrent: [
        gscPage("/strong", "current", 800, 9000, 4),
        gscPage("/also-strong", "current", 500, 6000, 5),
        gscPage("/opp", "current", 30, 1500, 7),
      ],
    });
    const [f] = detectInternalLinkOpportunities(input);
    expect(f!.confidence).toBe("low");
    expect(f!.recommended_action).toMatch(/verify/i);
  });
});
