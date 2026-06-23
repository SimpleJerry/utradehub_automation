/** Deterministic "PDF bytes -> text" port. */
export interface PdfTextExtractor {
  extractText(pdf: Uint8Array): Promise<string>;
}
