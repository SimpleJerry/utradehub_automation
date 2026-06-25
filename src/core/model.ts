import { z } from "zod";

/**
 * An ISO calendar date, `YYYY-MM-DD`. We validate both the shape (regex) and
 * that the components form a real calendar date (so `2026-13-40` is rejected,
 * not silently carried downstream into the submission plan's purchaseDate).
 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Round-trip through Date to catch invalid day-of-month (e.g. 2026-02-30).
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const IsoDateSchema = z
  .string()
  .refine(isRealIsoDate, { message: "documentDate must be an ISO date (YYYY-MM-DD)" });

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  // Provenance, stamped during grouping.
  docNumber: z.string().optional(),
  documentDate: IsoDateSchema.optional(),
  sourceFile: z.string().optional(),
});
export type LineItem = z.infer<typeof LineItemSchema>;

/** The fields the LLM is asked to extract from raw PDF text. */
export const ExtractedFieldsSchema = z.object({
  bpoNo: z.string().nullable(),
  documentDate: IsoDateSchema.nullable(),
  payToVendorNameEn: z.string().nullable(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
    }),
  ),
});
export type ExtractedFields = z.infer<typeof ExtractedFieldsSchema>;

export const PurchaseOrderSchema = z.object({
  sourceFile: z.string(),
  rawText: z.string(),
  bpoNo: z.string().nullable(),
  documentDate: IsoDateSchema.nullable(),
  payToVendorNameEn: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  // supplierNameKo and hsCode are NOT extracted by the LLM. They are filled
  // in after the fact from the CSV vendor mapping (applyVendorMapping); until
  // then they are explicitly null. Modeled as nullable (not optional) so the
  // field is always present and matches the GroupPreview DTO's `string | null`.
  supplierNameKo: z.string().nullable(),
  hsCode: z.string().nullable(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const SupplierGroupSchema = z.object({
  groupKey: z.string(),
  payToVendorNameEn: z.string().nullable(),
  // Sourced from the CSV vendor mapping, never the LLM; null until mapped.
  supplierNameKo: z.string().nullable(),
  hsCode: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  sourceFiles: z.array(z.string()),
});
export type SupplierGroup = z.infer<typeof SupplierGroupSchema>;

/** A grouped, ready-to-submit unit (one per supplier). */
export type SubmissionRecord = SupplierGroup;

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}
