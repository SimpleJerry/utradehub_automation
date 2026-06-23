import { describe, expect, it } from "vitest";
import { groupBySupplier } from "../src/core/grouping.js";
import type { PurchaseOrder } from "../src/core/model.js";

function order(file: string, vendor: string | null, items: number): PurchaseOrder {
  return {
    sourceFile: file,
    rawText: "",
    bpoNo: `PBO-${file}`,
    documentDate: "2026-04-13",
    payToVendorNameEn: vendor,
    lineItems: Array.from({ length: items }, (_, i) => ({
      description: `item-${i}`,
      quantity: 1,
      unitPrice: 2,
    })),
    supplierNameKo: vendor ? "공급사" : null,
    hsCode: vendor ? "1234567890" : null,
  };
}

describe("groupBySupplier", () => {
  it("groups m orders into n supplier units and merges line items", () => {
    const groups = groupBySupplier([
      order("a", "Skin Medience", 1),
      order("b", "Skin Medience", 2),
      order("c", "Other Vendor", 1),
    ]);
    expect(groups).toHaveLength(2);
    const skin = groups.find((g) => g.groupKey === "skin medience");
    expect(skin?.lineItems).toHaveLength(3);
    expect(skin?.sourceFiles).toEqual(["a", "b"]);
  });

  it("stamps provenance on merged line items", () => {
    const [group] = groupBySupplier([order("a", "Skin Medience", 1)]);
    expect(group?.lineItems[0]?.sourceFile).toBe("a");
    expect(group?.lineItems[0]?.docNumber).toBe("PBO-a");
  });

  it("routes orders without a supplier key to UNKNOWN_VENDOR", () => {
    const groups = groupBySupplier([order("a", null, 1)]);
    expect(groups[0]?.groupKey).toBe("UNKNOWN_VENDOR");
  });
});
