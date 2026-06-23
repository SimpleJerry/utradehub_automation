import { describe, expect, it } from "vitest";
import { groupBySupplier } from "../src/core/grouping.js";
import type { PurchaseOrder } from "../src/core/model.js";
import { applyVendorMapping, type VendorMapping } from "../src/core/vendor-mapping.js";
import { validateForSubmission } from "../src/core/validation.js";
import { parseVendorMapping } from "../src/adapters/vendor-mapping-loader.js";

/**
 * Pure-chain regression: extracted orders -> map -> group -> validate.
 * Uses synthetic data (no real PDF / private data committed). The "hand-edited
 * number" failure mode is represented as an order whose quantity survived
 * extraction; the chain must still map, group, and validate it correctly.
 */
const mappingResult = parseVendorMapping(
  "vendor_name_en,supplier_name_ko,hs_code\nSkin Medience,스킨메디언스,3916909000\n",
);

function order(file: string, vendor: string, quantity: number): PurchaseOrder {
  return {
    sourceFile: file,
    rawText: "",
    bpoNo: `PBO-${file}`,
    documentDate: "2026-04-13",
    payToVendorNameEn: vendor,
    lineItems: [{ description: "Widget", quantity, unitPrice: 5 }],
    supplierNameKo: null,
    hsCode: null,
  };
}

describe("extract -> map -> group -> validate", () => {
  it("produces one valid submission per supplier", () => {
    if (!mappingResult.ok) throw new Error("mapping fixture failed");
    const mapping: VendorMapping = mappingResult.value;

    const orders = [order("a", "Skin Medience", 3), order("b", "Skin Medience", 100)].map((o) =>
      applyVendorMapping(o, mapping),
    );

    const groups = groupBySupplier(orders);
    expect(groups).toHaveLength(1);

    const group = groups[0];
    expect(group?.supplierNameKo).toBe("스킨메디언스");
    expect(group?.hsCode).toBe("3916909000");
    expect(group?.lineItems).toHaveLength(2);

    const validation = validateForSubmission(group!);
    expect(validation.isValid).toBe(true);
  });
});
