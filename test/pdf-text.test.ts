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

  // The web server decodes uploads with Buffer.from(base64), yielding a Node Buffer.
  // unpdf rejects Buffer ("Please provide binary data as Uint8Array, rather than Buffer"),
  // so the adapter must accept a Buffer too.
  it("extracts text when given a Node Buffer", async () => {
    const pdf = await makePdf("Buffer path works");
    const buffer = Buffer.from(pdf);
    const text = await new UnpdfTextExtractor().extractText(buffer);
    expect(text).toContain("Buffer path works");
  });
});
