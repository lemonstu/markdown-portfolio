import { describe, expect, it } from "vitest";
import { detectPagesLosingClicks } from "./a-pages-losing-clicks";
import { gscPage, makeInput } from "../fixtures.test-util";

describe("Detector A — pages losing clicks", () => {
  it("flags a page that lost > 30% clicks with a meaningful absolute delta", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/post", "current", 200, 5000, 7)],
      gscPagesPrior: [gscPage("/post", "prior", 500, 5200, 4)],
    });
    const findings = detectPagesLosingClicks(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.finding_type).toBe("pages_losing_clicks");
    expect(findings[0]!.page_path).toBe("/post");
    expect(findings[0]!.evidence).toMatchObject({
      prior_clicks: 500,
      current_clicks: 200,
      pct_change: -60,
    });
  });

  it("escalates severe drops (>50%) to impact 5 and high confidence", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/big", "current", 100, 5000, 8)],
      gscPagesPrior: [gscPage("/big", "prior", 500, 5000, 3)],
    });
    const [f] = detectPagesLosingClicks(input);
    expect(f!.impact_score).toBe(5);
    expect(f!.confidence).toBe("high");
  });

  it("ignores pages below minimum prior clicks", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/tiny", "current", 5, 100, 9)],
      gscPagesPrior: [gscPage("/tiny", "prior", 50, 100, 4)], // < 100 minPriorClicks
    });
    expect(detectPagesLosingClicks(input)).toHaveLength(0);
  });

  it("ignores pages whose drop is below absolute delta threshold", () => {
    const input = makeInput({
      // 110 → 80 = -27%, 30 absolute — passes absolute but doesn't pass relative
      gscPagesCurrent: [gscPage("/small", "current", 80, 1000, 6)],
      gscPagesPrior: [gscPage("/small", "prior", 110, 1000, 5)],
    });
    expect(detectPagesLosingClicks(input)).toHaveLength(0);
  });

  it("ignores pages with no prior period entry", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/new", "current", 10, 1000, 5)],
      gscPagesPrior: [],
    });
    expect(detectPagesLosingClicks(input)).toHaveLength(0);
  });
});
