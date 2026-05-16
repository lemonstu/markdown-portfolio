import { describe, expect, it } from "vitest";
import { detectContentDecay } from "./d-content-decay";
import { gscPage, makeInput } from "../fixtures.test-util";

describe("Detector D — content decay", () => {
  it("flags decay when clicks decline AND impressions also fall", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/decay", "current", 60, 800, 9)],
      gscPagesPrior: [gscPage("/decay", "prior", 100, 1000, 8)],
    });
    const findings = detectContentDecay(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.finding_type).toBe("content_decay");
  });

  it("flags decay when clicks decline AND avg position worsens (even if impressions stable)", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/rank-drop", "current", 60, 1000, 10)],
      gscPagesPrior: [gscPage("/rank-drop", "prior", 100, 1000, 5)],
    });
    const findings = detectContentDecay(input);
    expect(findings).toHaveLength(1);
  });

  it("does not flag pages below minimum prior clicks", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/tiny", "current", 10, 800, 9)],
      gscPagesPrior: [gscPage("/tiny", "prior", 30, 1000, 8)], // < 80 minPriorClicks
    });
    expect(detectContentDecay(input)).toHaveLength(0);
  });

  it("does not flag a page whose clicks stayed > 80% (no decline signal)", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/stable", "current", 90, 900, 8)],
      gscPagesPrior: [gscPage("/stable", "prior", 100, 1000, 7)],
    });
    expect(detectContentDecay(input)).toHaveLength(0);
  });
});
