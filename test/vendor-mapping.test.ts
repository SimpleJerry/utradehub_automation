import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseVendorMapping } from "../src/adapters/vendor-mapping-loader.js";
import type { PurchaseOrder } from "../src/core/model.js";
import { applyVendorMapping, type VendorMapping } from "../src/core/vendor-mapping.js";

const here = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(join(here, "fixtures", "vendor-mapping", "mapping.csv"), "utf8");

function order(vendor: string | null): PurchaseOrder {
  return {
    sourceFile: "a.pdf",
    rawText: "",
    bpoNo: null,
    documentDate: null,
    payToVendorNameEn: vendor,
    lineItems: [],
    supplierNameKo: null,
    hsCode: null,
  };
}

describe("vendor mapping", () => {
  it("loads the golden CSV", () => {
    const result = parseVendorMapping(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.get("skin medience")).toEqual({
        supplierNameKo: "스킨메디언스",
        hsCode: "3916909000",
      });
    }
  });

  it("reports missing required columns", () => {
    const result = parseVendorMapping("vendor_name_en,hs_code\nx,1");
    expect(result.ok).toBe(false);
  });

  it("applies the mapping on a hit", () => {
    const result = parseVendorMapping(csv);
    if (!result.ok) throw new Error("fixture failed to parse");
    const mapped = applyVendorMapping(order("Skin Medience"), result.value);
    expect(mapped.supplierNameKo).toBe("스킨메디언스");
    expect(mapped.hsCode).toBe("3916909000");
  });

  it("leaves fields empty on a miss", () => {
    const empty: VendorMapping = new Map();
    const mapped = applyVendorMapping(order("Unknown Co"), empty);
    expect(mapped.supplierNameKo).toBeNull();
    expect(mapped.hsCode).toBeNull();
  });
});
