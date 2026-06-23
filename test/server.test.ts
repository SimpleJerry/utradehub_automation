import { describe, expect, it } from "vitest";
import { parseVendorMapping } from "../src/adapters/vendor-mapping-loader.js";
import { buildServer } from "../src/app/server/server.js";
import type { ServerDeps } from "../src/app/server/deps.js";
import type { PurchaseOrder } from "../src/core/model.js";
import { ok } from "../src/core/result.js";
import type { Extractor } from "../src/ports/extractor.js";
import type { BrowserDriver } from "../src/ports/browser-driver.js";

const csv = "vendor_name_en,supplier_name_ko,hs_code\nSkin Medience,스킨메디언스,3916909000\n";

function fakeDeps(): ServerDeps {
  const extractor: Extractor = {
    extract: (input) =>
      Promise.resolve(
        ok<PurchaseOrder>({
          sourceFile: input.sourceFile,
          rawText: "",
          bpoNo: "PBO-1",
          documentDate: "2026-04-13",
          payToVendorNameEn: "Skin Medience",
          lineItems: [{ description: "Widget", quantity: 1, unitPrice: 2 }],
          supplierNameKo: null,
          hsCode: null,
        }),
      ),
  };
  const driver: BrowserDriver = {
    createDraft: () => Promise.resolve(ok({ success: true, referenceNo: "123456", message: "ok" })),
  };
  return {
    makeExtractor: () => extractor,
    driver,
    parseMapping: (content) => parseVendorMapping(content),
    detectEnvironment: () => Promise.resolve([]),
  };
}

describe("HTTP API", () => {
  it("reports environment", async () => {
    const app = buildServer(fakeDeps());
    const res = await app.inject({ method: "GET", url: "/api/environment" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ issues: [] });
    await app.close();
  });

  it("previews then runs the approved groups", async () => {
    const app = buildServer(fakeDeps());

    const preview = await app.inject({
      method: "POST",
      url: "/api/preview",
      payload: {
        mappingCsv: csv,
        pdfs: [{ sourceFile: "a.pdf", base64: "AAAA" }],
        llm: { apiKey: "test-key" },
      },
    });
    const previewBody = JSON.parse(preview.payload) as {
      sessionId: string;
      groups: { groupKey: string; isValid: boolean }[];
    };
    expect(previewBody.sessionId).toBeTruthy();
    expect(previewBody.groups).toHaveLength(1);
    expect(previewBody.groups[0]?.isValid).toBe(true);

    const run = await app.inject({
      method: "POST",
      url: "/api/run",
      payload: {
        sessionId: previewBody.sessionId,
        approvedGroupKeys: previewBody.groups.map((g) => g.groupKey),
        credentials: { baseUrl: "https://x", username: "u", password: "p" },
      },
    });
    const report = JSON.parse(run.payload) as { succeeded: number };
    expect(report.succeeded).toBe(1);

    await app.close();
  });
});
