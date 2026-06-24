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

  // pdfjs (getDocumentProxy) transfers/detaches the input ArrayBuffer, so handing it the
  // caller's bytes corrupts them: a second extraction of the same buffer throws
  // "DataCloneError: Cannot transfer object of unsupported type". The adapter must copy.
  it("can extract the same buffer twice without detaching the caller's bytes", async () => {
    const pdf = await makePdf("Reusable bytes");
    const extractor = new UnpdfTextExtractor();
    const first = await extractor.extractText(pdf);
    const second = await extractor.extractText(pdf);
    expect(first).toContain("Reusable bytes");
    expect(second).toContain("Reusable bytes");
  });

  // uTradeHub POs are two-column tables. A merged-blob extraction interleaves the columns
  // and orphans values from their labels (e.g. the Pay-to Vendor name lands far from its
  // heading), which wrecks LLM extraction. The adapter must rebuild visual rows from glyph
  // positions: items on one row stay on one line ordered by x; separate rows stay separate.
  it("rebuilds visual rows so a label keeps its right-hand value on one line", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 200]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    // Same visual row (y = 150). Draw the right-hand value BEFORE the left label so the
    // ordering can only come from x position, not draw/stream order.
    page.drawText("Sensco", { x: 250, y: 150, size: 12, font });
    page.drawText("PayToVendor", { x: 20, y: 150, size: 12, font });
    // A different visual row.
    page.drawText("Purchaser", { x: 20, y: 110, size: 12, font });
    const pdf = await doc.save();

    const text = await new UnpdfTextExtractor().extractText(pdf);
    const vendorLine = text.split("\n").find((l) => l.includes("PayToVendor")) ?? "";
    expect(vendorLine).toContain("Sensco");
    expect(vendorLine.indexOf("PayToVendor")).toBeLessThan(vendorLine.indexOf("Sensco"));
    expect(vendorLine).not.toContain("Purchaser");
  });
});
