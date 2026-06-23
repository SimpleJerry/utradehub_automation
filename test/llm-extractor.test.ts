import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { LlmExtractor } from "../src/adapters/llm-extractor.js";
import type { ExtractedFields } from "../src/core/model.js";
import type { LlmProvider } from "../src/ports/llm.js";
import type { PdfTextExtractor } from "../src/ports/pdf-text.js";

const goodFields: ExtractedFields = {
  bpoNo: "PBO-1",
  documentDate: "2026-04-13",
  payToVendorNameEn: "Skin Medience",
  lineItems: [{ description: "Widget", quantity: 10, unitPrice: 5 }],
};

function fakePdfText(text: string): PdfTextExtractor {
  return { extractText: () => Promise.resolve(text) };
}

function fakeLlm(value: unknown): LlmProvider {
  return {
    generateObject<T>(_schema: z.ZodType<T>): Promise<T> {
      return Promise.resolve(value as T);
    },
  };
}

const pdf = new Uint8Array([1, 2, 3]);

describe("LlmExtractor", () => {
  it("extracts a valid purchase order", async () => {
    const extractor = new LlmExtractor(fakePdfText("some text"), fakeLlm(goodFields));
    const result = await extractor.extract({ sourceFile: "a.pdf", pdf });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceFile).toBe("a.pdf");
      expect(result.value.rawText).toBe("some text");
      expect(result.value.lineItems).toHaveLength(1);
    }
  });

  it("fails on empty pdf text", async () => {
    const extractor = new LlmExtractor(fakePdfText("   "), fakeLlm(goodFields));
    const result = await extractor.extract({ sourceFile: "a.pdf", pdf });
    expect(result.ok).toBe(false);
  });

  it("fails when the llm output violates the schema", async () => {
    const bad = { ...goodFields, lineItems: [{ description: "x", quantity: "NaN", unitPrice: 1 }] };
    const extractor = new LlmExtractor(fakePdfText("text"), fakeLlm(bad));
    const result = await extractor.extract({ sourceFile: "a.pdf", pdf });
    expect(result.ok).toBe(false);
  });
});
