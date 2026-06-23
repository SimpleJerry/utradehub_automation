import { describe, expect, it, vi } from "vitest";
import { previewBatch, submitBatch } from "../src/app/orchestrator.js";
import type { PurchaseOrder, SupplierGroup } from "../src/core/model.js";
import { err, ok } from "../src/core/result.js";
import { parseVendorMapping } from "../src/adapters/vendor-mapping-loader.js";
import type { Extractor } from "../src/ports/extractor.js";
import type { BrowserDriver } from "../src/ports/browser-driver.js";

const mappingResult = parseVendorMapping(
  "vendor_name_en,supplier_name_ko,hs_code\nSkin Medience,스킨메디언스,3916909000\n",
);
if (!mappingResult.ok) throw new Error("fixture");
const mapping = mappingResult.value;

function po(sourceFile: string, vendor: string): PurchaseOrder {
  return {
    sourceFile,
    rawText: "",
    bpoNo: "PBO-1",
    documentDate: "2026-04-13",
    payToVendorNameEn: vendor,
    lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
    supplierNameKo: null,
    hsCode: null,
  };
}

const credentials = { baseUrl: "https://x", username: "u", password: "p" };

describe("previewBatch", () => {
  it("extracts, maps, groups and validates without a browser", async () => {
    const extractor: Extractor = {
      extract: (input) => Promise.resolve(ok(po(input.sourceFile, "Skin Medience"))),
    };
    const outcome = await previewBatch(
      [
        { sourceFile: "a.pdf", pdf: new Uint8Array() },
        { sourceFile: "b.pdf", pdf: new Uint8Array() },
      ],
      { extractor, mapping },
    );
    expect(outcome.result.groups).toHaveLength(1);
    expect(outcome.result.groups[0]?.isValid).toBe(true);
    expect(outcome.result.groups[0]?.hsCode).toBe("3916909000");
  });

  it("records extraction failures", async () => {
    const extractor: Extractor = { extract: () => Promise.resolve(err("boom")) };
    const outcome = await previewBatch([{ sourceFile: "a.pdf", pdf: new Uint8Array() }], {
      extractor,
      mapping,
    });
    expect(outcome.result.extractionFailures).toHaveLength(1);
    expect(outcome.result.groups).toHaveLength(0);
  });
});

describe("submitBatch", () => {
  function group(key: string): SupplierGroup {
    return {
      groupKey: key,
      payToVendorNameEn: key,
      supplierNameKo: "스킨메디언스",
      hsCode: "3916909000",
      lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
      sourceFiles: ["a.pdf"],
    };
  }

  it("reports each group and one failure does not block the rest", async () => {
    const driver: BrowserDriver = {
      createDraft: (record) =>
        record.groupKey === "bad"
          ? Promise.resolve(err("site_flow_error"))
          : Promise.resolve(ok({ success: true, referenceNo: "123456", message: "ok" })),
    };
    const report = await submitBatch([group("good"), group("bad")], credentials, driver);
    expect(report.total).toBe(2);
    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
  });

  it("only drives the approved groups", async () => {
    const createDraft = vi.fn(() =>
      Promise.resolve(ok({ success: true, referenceNo: null, message: "ok" })),
    );
    const driver: BrowserDriver = { createDraft };
    await submitBatch([group("only")], credentials, driver);
    expect(createDraft).toHaveBeenCalledTimes(1);
  });
});
