import { describe, expect, it } from "vitest";
import { CRITICAL_ANCHORS, detectDrift } from "../src/adapters/site-drift.js";

describe("detectDrift", () => {
  it("returns null when all anchors are present", () => {
    expect(detectDrift(CRITICAL_ANCHORS, () => true)).toBeNull();
  });

  it("reports the first missing anchor with its step", () => {
    const missing = "#splybutton";
    const drift = detectDrift(CRITICAL_ANCHORS, (anchor) => anchor !== missing);
    expect(drift).not.toBeNull();
    expect(drift?.anchor).toBe(missing);
    expect(drift?.step).toBe("select_supplier");
  });
});
