import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isSubmittableLineItem } from "../core/line-item.js";
import type { LineItem, SupplierGroup } from "../core/model.js";
import type { SubmissionPlan } from "../core/submission-plan.js";

function diagnosticsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.UTH_DIAG === "1";
}

function finiteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function lineAmount(item: LineItem): number | null {
  return Number.isFinite(item.quantity) && Number.isFinite(item.unitPrice)
    ? item.quantity * item.unitPrice
    : null;
}

function stableHash(value: string | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function total(values: Array<number | null>): number {
  let sum = 0;
  for (const value of values) sum += value ?? 0;
  return sum;
}

export interface GroupDiagnosticSummary {
  groupKey: string;
  supplierNameKo: string | null;
  payToVendorNameEn: string | null;
  hsCode: string | null;
  sourceFiles: string[];
  lineItemCount: number;
  submittableLineItemCount: number;
  totals: {
    allQuantity: number;
    allAmount: number;
    submittableQuantity: number;
    submittableAmount: number;
  };
  lineItems: Array<{
    index: number;
    sourceFile: string | null;
    docNumberHash: string | null;
    documentDate: string | null;
    descriptionHash: string | null;
    quantity: number | null;
    unitPrice: number | null;
    amount: number | null;
    submittable: boolean;
  }>;
}

export function summarizeSupplierGroup(group: SupplierGroup): GroupDiagnosticSummary {
  const lineItems = group.lineItems.map((item, index) => {
    const submittable = isSubmittableLineItem(item);
    return {
      index,
      sourceFile: item.sourceFile ?? null,
      docNumberHash: stableHash(item.docNumber),
      documentDate: item.documentDate ?? null,
      descriptionHash: stableHash(item.description),
      quantity: finiteNumber(item.quantity),
      unitPrice: finiteNumber(item.unitPrice),
      amount: lineAmount(item),
      submittable,
    };
  });
  const submittable = lineItems.filter((item) => item.submittable);

  return {
    groupKey: group.groupKey,
    supplierNameKo: group.supplierNameKo,
    payToVendorNameEn: group.payToVendorNameEn,
    hsCode: group.hsCode,
    sourceFiles: group.sourceFiles,
    lineItemCount: lineItems.length,
    submittableLineItemCount: submittable.length,
    totals: {
      allQuantity: total(lineItems.map((item) => item.quantity)),
      allAmount: total(lineItems.map((item) => item.amount)),
      submittableQuantity: total(submittable.map((item) => item.quantity)),
      submittableAmount: total(submittable.map((item) => item.amount)),
    },
    lineItems,
  };
}

export function summarizeSubmissionPlan(plan: SubmissionPlan): {
  supplierKeyword: string;
  currency: string;
  lineItemCount: number;
  totals: { quantity: number; amount: number };
  lineItems: Array<{
    index: number;
    hsCode: string;
    productNameHash: string | null;
    purchaseDate: string | null;
    quantity: number | null;
    unitPrice: number | null;
    amount: number | null;
  }>;
} {
  const lineItems = plan.lineItems.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const amount = Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : null;
    return {
      index,
      hsCode: item.hsCode,
      productNameHash: stableHash(item.productName),
      purchaseDate: item.purchaseDate || null,
      quantity: finiteNumber(quantity),
      unitPrice: finiteNumber(unitPrice),
      amount,
    };
  });

  return {
    supplierKeyword: plan.supplierKeyword,
    currency: plan.basicInfo.currency,
    lineItemCount: lineItems.length,
    totals: {
      quantity: total(lineItems.map((item) => item.quantity)),
      amount: total(lineItems.map((item) => item.amount)),
    },
    lineItems,
  };
}

export async function writeDiagnosticFile(
  kind: string,
  payload: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (!diagnosticsEnabled(env)) return;
  const dir = env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeKind = kind.replace(/[^\w.-]+/g, "_");
  await writeFile(join(dir, `${stamp}_${safeKind}.json`), JSON.stringify(payload, null, 2));
}
