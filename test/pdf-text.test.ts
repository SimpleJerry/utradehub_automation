import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { UnpdfTextExtractor } from "../src/adapters/pdf-text.js";

async function makePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 20, y: 150, size: 18, font });
  return doc.save();
}

describe("UnpdfTextExtractor", () => {
  it("extracts text from a generated PDF", async () => {
    const pdf = await makePdf("Hello uTradeHub");
    const text = await new UnpdfTextExtractor().extractText(pdf);
    expect(text).toContain("Hello uTradeHub");
  });
});
