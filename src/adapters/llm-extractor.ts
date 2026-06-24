import {
  ExtractedFieldsSchema,
  PurchaseOrderSchema,
  type ExtractedFields,
  type PurchaseOrder,
} from "../core/model.js";
import { err, ok, type Result } from "../core/result.js";
import type { Extractor, ExtractInput } from "../ports/extractor.js";
import type { LlmProvider } from "../ports/llm.js";
import type { PdfTextExtractor } from "../ports/pdf-text.js";

const SYSTEM_PROMPT =
  "You extract structured fields from the raw text of a Korean trade purchase-order " +
  "(Blanket Purchase Order) PDF. Respond with a single JSON object using EXACTLY these keys, " +
  "do not rename, translate, or expand them: " +
  '"bpoNo" (the Blanket Purchase Order number, a string), ' +
  '"documentDate" (the document date as an ISO yyyy-mm-dd string), ' +
  '"payToVendorNameEn" (the English Pay-to Vendor name, a string), and ' +
  '"lineItems" (an array; each element has "description" string, "quantity" number, ' +
  '"unitPrice" number). Use null for an absent "bpoNo", "documentDate", or ' +
  '"payToVendorNameEn". Do not invent data.';

/** Pipeline: PDF bytes -> text (deterministic) -> LLM structured extraction -> validated PurchaseOrder. */
export class LlmExtractor implements Extractor {
  constructor(
    private readonly pdfText: PdfTextExtractor,
    private readonly llm: LlmProvider,
  ) {}

  async extract(input: ExtractInput): Promise<Result<PurchaseOrder>> {
    let text: string;
    try {
      text = await this.pdfText.extractText(input.pdf);
    } catch (error) {
      return err(`pdf_text_error: ${String(error)}`);
    }

    if (text.trim() === "") {
      return err("empty_pdf_text");
    }

    let fields: ExtractedFields;
    try {
      fields = await this.llm.generateObject(ExtractedFieldsSchema, SYSTEM_PROMPT, text);
    } catch (error) {
      return err(`llm_error: ${String(error)}`);
    }

    const parsed = PurchaseOrderSchema.safeParse({
      ...fields,
      sourceFile: input.sourceFile,
      rawText: text,
      supplierNameKo: null,
      hsCode: null,
    });
    if (!parsed.success) {
      return err(`schema_validation_failed: ${parsed.error.message}`);
    }
    return ok(parsed.data);
  }
}
