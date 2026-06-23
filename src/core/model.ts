import { z } from "zod";

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  // Provenance, stamped during grouping.
  docNumber: z.string().optional(),
  documentDate: z.string().optional(),
  sourceFile: z.string().optional(),
});
export type LineItem = z.infer<typeof LineItemSchema>;

/** The fields the LLM is asked to extract from raw PDF text. */
export const ExtractedFieldsSchema = z.object({
  bpoNo: z.string().nullable(),
  documentDate: z.string().nullable(),
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
  documentDate: z.string().nullable(),
  payToVendorNameEn: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  supplierNameKo: z.string().nullable(),
  hsCode: z.string().nullable(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const SupplierGroupSchema = z.object({
  groupKey: z.string(),
  payToVendorNameEn: z.string().nullable(),
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
