import { getDocumentProxy } from "unpdf";
import type { PdfTextExtractor } from "../ports/pdf-text.js";

interface PositionedItem {
  x: number;
  y: number;
  str: string;
}

// Glyph runs within this many PDF units of vertical distance belong to the same visual row.
const ROW_TOLERANCE = 3;

export class UnpdfTextExtractor implements PdfTextExtractor {
  async extractText(pdf: Uint8Array): Promise<string> {
    // Copy the bytes before handing them to pdfjs. getDocumentProxy transfers (detaches) the
    // ArrayBuffer it receives, so passing the caller's buffer corrupts it — a second extraction
    // of the same bytes then throws "DataCloneError: Cannot transfer object of unsupported type".
    // The copy also normalizes a Node Buffer (which unpdf rejects) to a plain Uint8Array.
    const data = new Uint8Array(pdf);
    const doc = await getDocumentProxy(data);

    const lines: string[] = [];
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      const items: PositionedItem[] = [];
      for (const raw of content.items as unknown as { str?: unknown; transform?: unknown }[]) {
        if (typeof raw.str !== "string" || raw.str.trim() === "") continue;
        const transform = raw.transform;
        if (!Array.isArray(transform)) continue;
        // transform = [a, b, c, d, e, f]; e (index 4) is x, f (index 5) is the baseline y.
        items.push({ x: Number(transform[4]), y: Number(transform[5]), str: raw.str });
      }
      lines.push(...reconstructRows(items));
    }
    return lines.join("\n").trim();
  }
}

/**
 * uTradeHub purchase orders are two-column tables. unpdf's merged extraction concatenates
 * glyph runs in stream order, interleaving the columns so values are orphaned from their
 * labels — which makes the Pay-to Vendor name (and others) unrecoverable by the LLM. Rebuild
 * the visual rows instead: group runs by baseline y (top-down), order each row left-to-right
 * by x. The result reads like the printed page, one record per line.
 */
function reconstructRows(items: PositionedItem[]): string[] {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: string[] = [];
  let row: PositionedItem[] = [];
  let rowY: number | null = null;

  const flush = (): void => {
    if (row.length === 0) return;
    const line = row
      .sort((a, b) => a.x - b.x)
      .map((it) => it.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line !== "") rows.push(line);
    row = [];
  };

  for (const it of items) {
    if (rowY === null || Math.abs(it.y - rowY) > ROW_TOLERANCE) {
      flush();
      rowY = it.y;
    }
    row.push(it);
  }
  flush();
  return rows;
}
