import { describe, expect, it, vi } from "vitest";
import type { SupplierGroup } from "../../core/model.js";
import { ok } from "../../core/result.js";
import type { VendorMapping } from "../../core/vendor-mapping.js";
import type { BrowserDriver } from "../../ports/browser-driver.js";
import type { Extractor } from "../../ports/extractor.js";
import { buildServer } from "./server.js";
import type { ServerDeps } from "./deps.js";

const sampleGroup: SupplierGroup = {
  groupKey: "acme",
  payToVendorNameEn: "Acme",
  supplierNameKo: "에이씨엠이",
  hsCode: "1234",
  sourceFiles: ["po.pdf"],
  lineItems: [
    {
      description: "WIDGET X",
      quantity: 5,
      unitPrice: 200,
      docNumber: "PO-1",
      documentDate: "2026-01-01",
      sourceFile: "po.pdf",
    },
  ],
};

function makeDeps(driver: BrowserDriver): ServerDeps {
  const extractor: Extractor = {
    extract: vi.fn(async () =>
      ok({
        sourceFile: "po.pdf",
        rawText: "raw",
        bpoNo: "PO-1",
        documentDate: "2026-01-01",
        payToVendorNameEn: "Acme",
        supplierNameKo: "에이씨엠이",
        hsCode: "1234",
        lineItems: sampleGroup.lineItems,
      }),
    ),
  };

  return {
    makeExtractor: () => extractor,
    driver,
    parseMapping: () =>
      ok(
        new Map([
          [
            "Acme",
            {
              supplierNameKo: "에이씨엠이",
              hsCode: "1234",
            },
          ],
        ]) as VendorMapping,
      ),
    detectEnvironment: async () => [],
  };
}

describe("server /api/run human gate", () => {
  it("rejects run requests without operatorConfirmed true and does not call the driver", async () => {
    const driver: BrowserDriver = { createDraft: vi.fn() };
    const deps = makeDeps(driver);
    const app = buildServer(deps);
    const preview = await app.inject({
      method: "POST",
      url: "/api/preview",
      payload: {
        mappingCsv: "unused",
        pdfs: [{ sourceFile: "po.pdf", base64: Buffer.from("pdf").toString("base64") }],
        llm: { apiKey: "sk-test" },
      },
    });
    const { sessionId } = preview.json() as { sessionId: string };

    const response = await app.inject({
      method: "POST",
      url: "/api/run",
      payload: {
        sessionId,
        approvedGroupKeys: ["acme"],
        credentials: { baseUrl: "https://www.utradehub.or.kr/", loginMode: "manual" },
      },
    });

    expect(response.json()).toEqual({ error: "operator_confirmation_required" });
    expect(driver.createDraft).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects unknown approvedGroupKeys with a clear error and does not call the driver", async () => {
    const driver: BrowserDriver = { createDraft: vi.fn() };
    const deps = makeDeps(driver);
    const app = buildServer(deps);
    const preview = await app.inject({
      method: "POST",
      url: "/api/preview",
      payload: {
        mappingCsv: "unused",
        pdfs: [{ sourceFile: "po.pdf", base64: Buffer.from("pdf").toString("base64") }],
        llm: { apiKey: "sk-test" },
      },
    });
    const { sessionId } = preview.json() as { sessionId: string };

    const response = await app.inject({
      method: "POST",
      url: "/api/run",
      payload: {
        sessionId,
        approvedGroupKeys: ["missing"],
        operatorConfirmed: true,
        credentials: { baseUrl: "https://www.utradehub.or.kr/", loginMode: "manual" },
      },
    });

    expect(response.json()).toEqual({
      error: "unknown_approved_group_keys",
      unknownGroupKeys: ["missing"],
    });
    expect(driver.createDraft).not.toHaveBeenCalled();
    await app.close();
  });

  it("submits approved groups only after explicit operator confirmation", async () => {
    const driver: BrowserDriver = {
      createDraft: vi.fn(async () =>
        ok({ success: true, referenceNo: "TMP-1", message: "temporary draft saved" }),
      ),
    };
    const deps = makeDeps(driver);
    const app = buildServer(deps);
    const preview = await app.inject({
      method: "POST",
      url: "/api/preview",
      payload: {
        mappingCsv: "unused",
        pdfs: [{ sourceFile: "po.pdf", base64: Buffer.from("pdf").toString("base64") }],
        llm: { apiKey: "sk-test" },
      },
    });
    const { sessionId } = preview.json() as { sessionId: string };

    const response = await app.inject({
      method: "POST",
      url: "/api/run",
      payload: {
        sessionId,
        approvedGroupKeys: ["acme"],
        operatorConfirmed: true,
        credentials: { baseUrl: "https://www.utradehub.or.kr/", loginMode: "manual" },
      },
    });

    expect(response.json()).toMatchObject({ total: 1, succeeded: 1, failed: 0 });
    expect(driver.createDraft).toHaveBeenCalledOnce();
    await app.close();
  });
});

