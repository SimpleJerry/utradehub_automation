import { describe, expect, it } from "vitest";
import { checkEnvironment } from "../src/app/environment.js";

describe("checkEnvironment", () => {
  it("has no issues when chrome is present", () => {
    expect(checkEnvironment({ hasChrome: true })).toEqual([]);
  });

  it("flags missing chrome", () => {
    const issues = checkEnvironment({ hasChrome: false });
    expect(issues.map((i) => i.key)).toEqual(["chrome"]);
  });
});
