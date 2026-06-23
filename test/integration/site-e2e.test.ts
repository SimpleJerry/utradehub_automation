import { describe, expect, it } from "vitest";
import { PlaywrightDriver } from "../../src/adapters/playwright-driver.js";
import { credentialsFromEnv } from "../../src/adapters/site-credentials.js";
import type { SubmissionRecord } from "../../src/core/model.js";

const gated = process.env.SITE_E2E === "1";

// Gated: only runs with SITE_E2E=1 against the live uTradeHub site. Needs Google Chrome
// installed (channel:"chrome") and SITE_* credentials in the environment.
describe.skipIf(!gated)("uTradeHub draft (gated)", () => {
  it("creates a 임시저장 draft", async () => {
    const credentials = credentialsFromEnv();
    if (!credentials.ok) throw new Error(credentials.error);

    const record: SubmissionRecord = {
      groupKey: "skin medience",
      payToVendorNameEn: "Skin Medience",
      supplierNameKo: "스킨메디언스",
      hsCode: "3916909000",
      lineItems: [
        {
          description: "Test Item",
          quantity: 1,
          unitPrice: 100,
          docNumber: "PBO-TEST",
          documentDate: "2026-04-13",
          sourceFile: "test.pdf",
        },
      ],
      sourceFiles: ["test.pdf"],
    };

    const result = await new PlaywrightDriver().createDraft(record, credentials.value);
    expect(result.ok).toBe(true);
  }, 120_000);
});
