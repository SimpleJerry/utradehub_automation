import { describe, expect, it } from "vitest";
import { checkEnvironment } from "../src/app/environment.js";

describe("checkEnvironment", () => {
  it("has no issues when chrome and llm key are present", () => {
    expect(checkEnvironment({ hasChrome: true, llmApiKey: "key" })).toEqual([]);
  });

  it("flags missing chrome and missing llm key", () => {
    const issues = checkEnvironment({ hasChrome: false, llmApiKey: "" });
    expect(issues.map((i) => i.key)).toEqual(["chrome", "llm"]);
  });
});
