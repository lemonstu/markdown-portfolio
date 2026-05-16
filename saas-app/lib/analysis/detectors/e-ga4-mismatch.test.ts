import { describe, expect, it } from "vitest";
import { detectGa4Mismatch } from "./e-ga4-mismatch";
import { ga4, makeInput } from "../fixtures.test-util";

describe("Detector E — GA4 engagement / conversion mismatch", () => {
  it("flags high-engagement page with zero key events as likely measurement issue", () => {
    const input = makeInput({
      ga4LandingPages: [ga4("/newsletter", 400, 320, 0)],
    });
    const findings = detectGa4Mismatch(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.finding_type).toBe("ga4_engagement_mismatch");
    expect(findings[0]!.why_it_matters).toMatch(/measurement problem/i);
  });

  it("flags high-engagement page with very low key-events rate as placement/intent issue", () => {
    // 500 sessions, 400 engaged (80%), 5 key events (1% < 2% threshold)
    const input = makeInput({
      ga4LandingPages: [ga4("/page", 500, 400, 5)],
    });
    const findings = detectGa4Mismatch(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.why_it_matters).toMatch(/bottleneck/i);
  });

  it("does not flag pages below minimum sessions", () => {
    const input = makeInput({
      ga4LandingPages: [ga4("/quiet", 100, 80, 0)],
    });
    expect(detectGa4Mismatch(input)).toHaveLength(0);
  });

  it("does not flag pages with healthy conversion behavior", () => {
    // 500 sessions, 70% engagement, 50 events (10% — well above threshold)
    const input = makeInput({
      ga4LandingPages: [ga4("/healthy", 500, 350, 50)],
    });
    expect(detectGa4Mismatch(input)).toHaveLength(0);
  });
});
