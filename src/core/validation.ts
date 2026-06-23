import type { SubmissionRecord, ValidationResult } from "./model.js";

/** Deterministic preflight: decide whether a submission record is ready. */
export function validateForSubmission(record: SubmissionRecord): ValidationResult {
  const missingFields: string[] = [];

  if (!record.supplierNameKo) missingFields.push("supplierNameKo");
  if (!record.hsCode) missingFields.push("hsCode");

  const hasValidLineItem = record.lineItems.some(
    (item) =>
      item.description.trim() !== "" &&
      Number.isFinite(item.quantity) &&
      Number.isFinite(item.unitPrice),
  );
  if (!hasValidLineItem) missingFields.push("lineItems");

  return { isValid: missingFields.length === 0, missingFields };
}
