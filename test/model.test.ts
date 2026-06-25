import { describe, expect, it } from "vitest";
import { ExtractedFieldsSchema, LineItemSchema, PurchaseOrderSchema } from "../src/core/model.js";

const baseOrder = {
  sourceFile: "a.pdf",
  rawText: "raw",
  bpoNo: "PBO-1",
  documentDate: "2026-04-13",
  payToVendorNameEn: "Skin Medience",
  lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
  supplierNameKo: null,
  hsCode: null,
};

describe("PurchaseOrderSchema", () => {
  it("accepts a well-formed order", () => {
    const result = PurchaseOrderSchema.safeParse(baseOrder);
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric quantity", () => {
    const result = PurchaseOrderSchema.safeParse({
      ...baseOrder,
      bpoNo: null,
      documentDate: null,
      payToVendorNameEn: null,
      lineItems: [{ description: "Widget", quantity: "1", unitPrice: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a null documentDate (date is genuinely absent)", () => {
    const result = PurchaseOrderSchema.safeParse({ ...baseOrder, documentDate: null });
    expect(result.success).toBe(true);
  });

  it("accepts null supplierNameKo and hsCode (filled later from CSV mapping)", () => {
    const result = PurchaseOrderSchema.safeParse({
      ...baseOrder,
      supplierNameKo: null,
      hsCode: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts mapped (non-null) supplierNameKo and hsCode", () => {
    const result = PurchaseOrderSchema.safeParse({
      ...baseOrder,
      supplierNameKo: "스킨메디언스",
      hsCode: "3304.99",
    });
    expect(result.success).toBe(true);
  });
});

describe("documentDate ISO validation", () => {
  it("accepts a valid ISO date", () => {
    const result = PurchaseOrderSchema.safeParse({ ...baseOrder, documentDate: "2026-04-13" });
    expect(result.success).toBe(true);
  });

  it.each([
    ["wrong order / locale format", "13/04/2026"],
    ["slashes instead of dashes", "2026/04/13"],
    ["missing zero padding", "2026-4-3"],
    ["a non-date string", "April 13, 2026"],
    ["empty string", ""],
    ["impossible month", "2026-13-01"],
    ["impossible day of month", "2026-02-30"],
    ["zero month", "2026-00-10"],
  ])("rejects %s (%s)", (_label, value) => {
    const result = PurchaseOrderSchema.safeParse({ ...baseOrder, documentDate: value });
    expect(result.success).toBe(false);
  });

  it("surfaces a documentDate error path for a bad date", () => {
    const result = PurchaseOrderSchema.safeParse({ ...baseOrder, documentDate: "2026-13-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("documentDate"))).toBe(true);
    }
  });

  it("applies the same ISO rule to ExtractedFields.documentDate", () => {
    const bad = ExtractedFieldsSchema.safeParse({
      bpoNo: null,
      documentDate: "2026/04/13",
      payToVendorNameEn: null,
      lineItems: [],
    });
    expect(bad.success).toBe(false);

    const good = ExtractedFieldsSchema.safeParse({
      bpoNo: null,
      documentDate: "2026-04-13",
      payToVendorNameEn: null,
      lineItems: [],
    });
    expect(good.success).toBe(true);
  });
});

describe("LineItemSchema documentDate", () => {
  it("accepts an omitted documentDate (optional provenance)", () => {
    const result = LineItemSchema.safeParse({ description: "W", quantity: 1, unitPrice: 2 });
    expect(result.success).toBe(true);
  });

  it("accepts a valid ISO documentDate", () => {
    const result = LineItemSchema.safeParse({
      description: "W",
      quantity: 1,
      unitPrice: 2,
      documentDate: "2026-04-13",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed documentDate", () => {
    const result = LineItemSchema.safeParse({
      description: "W",
      quantity: 1,
      unitPrice: 2,
      documentDate: "13-04-2026",
    });
    expect(result.success).toBe(false);
  });
});
