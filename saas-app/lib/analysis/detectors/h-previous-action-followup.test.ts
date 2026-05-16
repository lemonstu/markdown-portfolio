import { describe, expect, it } from "vitest";
import { detectPreviousActionFollowup } from "./h-previous-action-followup";
import { completedAction, gscPage, makeInput } from "../fixtures.test-util";

describe("Detector H — previous action follow-up", () => {
  it("reports improvement when CTR and clicks both rose on a referenced page", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 150, 3000, 5)],
      gscPagesPrior: [gscPage("/page", "prior", 100, 3000, 7)],
      previousCompletedActions: [
        completedAction("Title rewrite on /page", "Optimize for the head query"),
      ],
    });
    const findings = detectPreviousActionFollowup(input);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.recommended_action).toMatch(/Positive/i);
  });

  it("reports 'no improvement yet' when clicks fell despite the action", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/page", "current", 80, 3000, 8)],
      gscPagesPrior: [gscPage("/page", "prior", 100, 3000, 7)],
      previousCompletedActions: [completedAction("Refresh /page")],
    });
    const [f] = detectPreviousActionFollowup(input);
    expect(f!.recommended_action).toMatch(/Too early|no positive signal/i);
  });

  it("ignores completed actions that don't mention a known page", () => {
    const input = makeInput({
      gscPagesCurrent: [gscPage("/known", "current", 100, 1000, 5)],
      gscPagesPrior: [gscPage("/known", "prior", 100, 1000, 5)],
      previousCompletedActions: [completedAction("General internal cleanup")],
    });
    expect(detectPreviousActionFollowup(input)).toHaveLength(0);
  });
});
