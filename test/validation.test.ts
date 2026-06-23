import { describe, expect, it } from "vitest";
import type { SubmissionRecord } from "../src/core/model.js";
import { validateForSubmission } from "../src/core/validation.js";

function record(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    groupKey: "skin medience",
    payToVendorNameEn: "Skin Medience",
    supplierNameKo: "스킨메디언스",
    hsCode: "3916909000",
    lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
    sourceFiles: ["a.pdf"],
    ...overrides,
  };
}

describe("validateForSubmission", () => {
  it("passes a ready record", () => {
    expect(validateForSubmission(record())).toEqual({ isValid: true, missingFields: [] });
  });

  it("flags a missing hs code and empty line items", () => {
    const result = validateForSubmission(record({ hsCode: null, lineItems: [] }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("hsCode");
    expect(result.missingFields).toContain("lineItems");
  });

  it("does not throw on an empty record", () => {
    const result = validateForSubmission(
      record({ supplierNameKo: null, hsCode: null, lineItems: [] }),
    );
    expect(result.isValid).toBe(false);
  });
});
