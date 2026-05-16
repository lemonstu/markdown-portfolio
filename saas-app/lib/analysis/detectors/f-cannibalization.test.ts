import { describe, expect, it } from "vitest";
import { detectCannibalization } from "./f-cannibalization";
import { gscPageQuery, makeInput } from "../fixtures.test-util";

describe("Detector F — cannibalization", () => {
  it("flags two URLs ranking for the same query", () => {
    const input = makeInput({
      gscPageQueriesCurrent: [
        gscPageQuery("/dominant", "the query", 20, 400, 5),
        gscPageQuery("/secondary", "the query", 4, 200, 13),
      ],
    });
    const findings = detectCannibalization(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.evidence).toMatchObject({
      query: "the query",
      dominant_url: "/dominant",
      secondary_url: "/secondary",
    });
  });

  it("ignores when secondary URL has too few impressions", () => {
    const input = makeInput({
      gscPageQueriesCurrent: [
        gscPageQuery("/dominant", "query", 20, 400, 5),
        gscPageQuery("/secondary", "query", 1, 20, 18),
      ],
    });
    expect(detectCannibalization(input)).toHaveLength(0);
  });

  it("ignores when secondary URL is beyond position 30", () => {
    const input = makeInput({
      gscPageQueriesCurrent: [
        gscPageQuery("/dominant", "query", 20, 400, 5),
        gscPageQuery("/secondary", "query", 0, 100, 45),
      ],
    });
    expect(detectCannibalization(input)).toHaveLength(0);
  });

  it("ignores single-page queries", () => {
    const input = makeInput({
      gscPageQueriesCurrent: [gscPageQuery("/only", "query", 20, 400, 5)],
    });
    expect(detectCannibalization(input)).toHaveLength(0);
  });
});
