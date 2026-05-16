import { describe, expect, it } from "vitest";
import { detectNearWinKeywords } from "./c-near-win-keywords";
import { gscQuery, makeInput } from "../fixtures.test-util";

describe("Detector C — near-win keywords", () => {
  it("flags queries in positions 4–20 with enough impressions", () => {
    const input = makeInput({
      gscQueriesCurrent: [gscQuery("near win", "current", 30, 1500, 7)],
    });
    const findings = detectNearWinKeywords(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.query).toBe("near win");
    expect(findings[0]!.impact_score).toBe(5); // >= 1500 imp
  });

  it("ignores queries above position 20", () => {
    const input = makeInput({
      gscQueriesCurrent: [gscQuery("too far", "current", 5, 300, 25)],
    });
    expect(detectNearWinKeywords(input)).toHaveLength(0);
  });

  it("ignores queries at top-3 positions (not near-wins)", () => {
    const input = makeInput({
      gscQueriesCurrent: [gscQuery("already top", "current", 200, 1000, 2)],
    });
    expect(detectNearWinKeywords(input)).toHaveLength(0);
  });

  it("ignores queries below impression threshold", () => {
    const input = makeInput({
      gscQueriesCurrent: [gscQuery("low vol", "current", 1, 50, 8)],
    });
    expect(detectNearWinKeywords(input)).toHaveLength(0);
  });
});
