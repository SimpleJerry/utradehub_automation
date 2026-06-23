import { describe, expect, it } from "vitest";
import { SITE_DEFAULTS } from "../src/adapters/site-contract.js";
import type { SubmissionRecord } from "../src/core/model.js";
import { buildProductName, buildSubmissionPlan } from "../src/core/submission-plan.js";

function record(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    groupKey: "skin medience",
    payToVendorNameEn: "Skin Medience",
    supplierNameKo: "스킨메디언스",
    hsCode: "3916909000",
    lineItems: [{ description: "Widget", quantity: 2, unitPrice: 50, docNumber: "PBO-1" }],
    sourceFiles: ["a.pdf"],
    ...overrides,
  };
}

describe("buildSubmissionPlan", () => {
  it("maps each valid line item with hs code, quantity and unit price", () => {
    const plan = buildSubmissionPlan(record(), SITE_DEFAULTS);
    expect(plan.supplierKeyword).toBe("스킨메디언스");
    expect(plan.basicInfo).toEqual({ receiver: "EKTNET@", materialType: "2AJ", currency: "KRW" });
    expect(plan.lineItems).toHaveLength(1);
    expect(plan.lineItems[0]).toMatchObject({
      hsCode: "3916909000",
      quantity: "2",
      unitPrice: "50",
    });
  });

  it("drops invalid line items", () => {
    const plan = buildSubmissionPlan(
      record({ lineItems: [{ description: "", quantity: 1, unitPrice: 2 }] }),
      SITE_DEFAULTS,
    );
    expect(plan.lineItems).toHaveLength(0);
  });
});

describe("buildProductName", () => {
  it("appends the doc number on a second line when present", () => {
    expect(buildProductName("Widget", "PBO-1")).toBe("Widget\nPBO-1");
  });

  it("is just the description when there is no doc number", () => {
    expect(buildProductName("Widget", undefined)).toBe("Widget");
  });
});
