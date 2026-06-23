import type { SubmissionRecord } from "./model.js";

export interface SubmissionDefaults {
  receiver: string;
  materialType: string;
  currency: string;
}

export interface BasicInfoPlan {
  receiver: string;
  materialType: string;
  currency: string;
}

export interface LineItemPlan {
  hsCode: string;
  productName: string;
  unitPrice: string;
  quantity: string;
  purchaseDate: string;
}

export interface SubmissionPlan {
  supplierKeyword: string;
  basicInfo: BasicInfoPlan;
  lineItems: LineItemPlan[];
}

/** 품명 = description, plus the doc number on a second line when present (matches the legacy site flow). */
export function buildProductName(description: string, docNumber: string | undefined): string {
  return docNumber ? `${description}\n${docNumber}` : description;
}

/** Pure: turn a validated SubmissionRecord into structured form-fill instructions. */
export function buildSubmissionPlan(
  record: SubmissionRecord,
  defaults: SubmissionDefaults,
): SubmissionPlan {
  const hsCode = record.hsCode ?? "";
  const lineItems: LineItemPlan[] = record.lineItems
    .filter(
      (item) =>
        item.description.trim() !== "" &&
        Number.isFinite(item.quantity) &&
        Number.isFinite(item.unitPrice),
    )
    .map((item) => ({
      hsCode,
      productName: buildProductName(item.description.trim(), item.docNumber),
      unitPrice: String(item.unitPrice),
      quantity: String(item.quantity),
      purchaseDate: item.documentDate ?? "",
    }));

  return {
    supplierKeyword: record.supplierNameKo ?? "",
    basicInfo: {
      receiver: defaults.receiver,
      materialType: defaults.materialType,
      currency: defaults.currency,
    },
    lineItems,
  };
}
