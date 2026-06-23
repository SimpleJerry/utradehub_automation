import { describe, expect, it } from "vitest";
import { PurchaseOrderSchema } from "../src/core/model.js";

describe("PurchaseOrderSchema", () => {
  it("accepts a well-formed order", () => {
    const result = PurchaseOrderSchema.safeParse({
      sourceFile: "a.pdf",
      rawText: "raw",
      bpoNo: "PBO-1",
      documentDate: "2026-04-13",
      payToVendorNameEn: "Skin Medience",
      lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
      supplierNameKo: null,
      hsCode: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric quantity", () => {
    const result = PurchaseOrderSchema.safeParse({
      sourceFile: "a.pdf",
      rawText: "raw",
      bpoNo: null,
      documentDate: null,
      payToVendorNameEn: null,
      lineItems: [{ description: "Widget", quantity: "1", unitPrice: 2 }],
      supplierNameKo: null,
      hsCode: null,
    });
    expect(result.success).toBe(false);
  });
});
