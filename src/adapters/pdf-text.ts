import { extractText, getDocumentProxy } from "unpdf";
import type { PdfTextExtractor } from "../ports/pdf-text.js";

export class UnpdfTextExtractor implements PdfTextExtractor {
  async extractText(pdf: Uint8Array): Promise<string> {
    const doc = await getDocumentProxy(pdf);
    const result = await extractText(doc, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    return text.trim();
  }
}
