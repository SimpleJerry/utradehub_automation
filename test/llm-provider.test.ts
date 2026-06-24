import { describe, expect, it } from "vitest";
import { describeLlmError } from "../src/adapters/llm-provider.js";

describe("describeLlmError", () => {
  // The AI SDK's NoObjectGeneratedError hides which field failed behind a generic message;
  // its `text` (raw model output) and `cause` (validation detail) carry the real signal.
  it("includes the raw model output and the validation cause for a schema mismatch", () => {
    const error = {
      name: "AI_NoObjectGeneratedError",
      message: "No object generated: response did not match schema.",
      cause: {
        message:
          'Type validation failed. Error: [{"code":"invalid_type","expected":"number","path":["lineItems",0,"unitPrice"]}]',
      },
      text: '{"bpoNo":"PBO-1","lineItems":[{"description":"x","quantity":1,"unitPrice":"5,000"}]}',
    };
    const msg = describeLlmError(error);
    expect(msg).toContain("No object generated");
    expect(msg).toContain("unitPrice");
    expect(msg).toContain('"unitPrice":"5,000"');
  });

  it("falls back to a string for a plain error", () => {
    expect(describeLlmError(new Error("boom"))).toContain("boom");
  });
});
