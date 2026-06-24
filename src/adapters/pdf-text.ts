import { extractText, getDocumentProxy } from "unpdf";
import type { PdfTextExtractor } from "../ports/pdf-text.js";

export class UnpdfTextExtractor implements PdfTextExtractor {
  async extractText(pdf: Uint8Array): Promise<string> {
    // unpdf (pdfjs) rejects a Node Buffer and demands a plain Uint8Array, even though
    // Buffer is a Uint8Array subclass. The web server decodes uploads with Buffer.from,
    // so normalize to a non-Buffer Uint8Array here.
    const data = Buffer.isBuffer(pdf) ? new Uint8Array(pdf) : pdf;
    const doc = await getDocumentProxy(data);
    const result = await extractText(doc, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    return text.trim();
  }
}
