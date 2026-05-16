import { describe, expect, it } from "vitest";
import { detectRisingImpressionsLowCtr } from "./b-rising-impressions-low-ctr";
import { gscPage, makeInput } from "../fixtures.test-util";

describe("Detector B — rising impressions / low CTR", () => {
  it("flags a page well below expected CTR at its current position", () => {
    // Position 6 → expected CTR ~4.2%. Observed 1.8% → ratio 0.43, below 0.5
    // Impressions 2000 → lift ≈ (0.042 - 0.018) * 2000 = 48 clicks
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 36, 2000, 6)],
    });
    const findings = detectRisingImpressionsLowCtr(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.finding_type).toBe("rising_impressions_low_ctr");
    expect(findings[0]!.evidence).toMatchObject({ position: 6 });
  });

  it("ignores pages below the impression threshold", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 5, 400, 6)],
    });
    expect(detectRisingImpressionsLowCtr(input)).toHaveLength(0);
  });

  it("ignores pages whose CTR is already healthy at that position", () => {
    // Position 6 → expected 4.2%. Observed 5% (above expected).
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 100, 2000, 6)],
    });
    expect(detectRisingImpressionsLowCtr(input)).toHaveLength(0);
  });

  it("ignores pages above the position cap", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 5, 2000, 18)],
    });
    expect(detectRisingImpressionsLowCtr(input)).toHaveLength(0);
  });
});
