import type { LineItem } from "./model.js";

/**
 * Single source of truth for "can this line item be entered into a draft".
 * A draft row needs a non-empty 품명, a finite 수량 and a finite 단가; anything
 * else is silently skipped by {@link buildSubmissionPlan}, so the same predicate
 * feeds validation and the preview's drop warning to keep them in lockstep.
 *
 * Returns the identifiers of the failing fields (empty = submittable), in field
 * order, matching the identifier style of {@link ValidationResult.missingFields}.
 */
export function lineItemRejections(item: LineItem): string[] {
  const reasons: string[] = [];
  if (item.description.trim() === "") reasons.push("description");
  if (!Number.isFinite(item.quantity)) reasons.push("quantity");
  if (!Number.isFinite(item.unitPrice)) reasons.push("unitPrice");
  return reasons;
}

export function isSubmittableLineItem(item: LineItem): boolean {
  return lineItemRejections(item).length === 0;
}
