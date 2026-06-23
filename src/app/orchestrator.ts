import { groupBySupplier } from "../core/grouping.js";
import type { PurchaseOrder, SupplierGroup } from "../core/model.js";
import { applyVendorMapping, type VendorMapping } from "../core/vendor-mapping.js";
import { validateForSubmission } from "../core/validation.js";
import type { BrowserDriver, SiteCredentials } from "../ports/browser-driver.js";
import type { Extractor } from "../ports/extractor.js";
import type {
  BatchReport,
  ExtractionFailure,
  GroupOutcome,
  GroupPreview,
  PreviewResult,
} from "./dto.js";

export interface PdfInput {
  sourceFile: string;
  pdf: Uint8Array;
}

export interface PreviewPorts {
  extractor: Extractor;
  mapping: VendorMapping;
}

export interface PreviewOutcome {
  groups: SupplierGroup[];
  result: PreviewResult;
}

export type ProgressEvent =
  | { type: "group_start"; groupKey: string; index: number; total: number }
  | { type: "group_done"; outcome: GroupOutcome };

export function toGroupPreview(group: SupplierGroup): GroupPreview {
  const validation = validateForSubmission(group);
  return {
    groupKey: group.groupKey,
    payToVendorNameEn: group.payToVendorNameEn,
    supplierNameKo: group.supplierNameKo,
    hsCode: group.hsCode,
    sourceFiles: group.sourceFiles,
    lineItems: group.lineItems,
    isValid: validation.isValid,
    missingFields: validation.missingFields,
  };
}

/** Dry run: extract -> map -> group -> validate. Never touches the browser. */
export async function previewBatch(inputs: PdfInput[], ports: PreviewPorts): Promise<PreviewOutcome> {
  const orders: PurchaseOrder[] = [];
  const extractionFailures: ExtractionFailure[] = [];

  for (const input of inputs) {
    const result = await ports.extractor.extract(input);
    if (!result.ok) {
      extractionFailures.push({ sourceFile: input.sourceFile, error: result.error });
      continue;
    }
    orders.push(applyVendorMapping(result.value, ports.mapping));
  }

  const groups = groupBySupplier(orders);
  return {
    groups,
    result: { groups: groups.map(toGroupPreview), extractionFailures },
  };
}

/** Drive only the human-approved groups; one failure does not block the rest. */
export async function submitBatch(
  approved: SupplierGroup[],
  credentials: SiteCredentials,
  driver: BrowserDriver,
  onProgress?: (event: ProgressEvent) => void,
): Promise<BatchReport> {
  const outcomes: GroupOutcome[] = [];
  let index = 0;

  for (const group of approved) {
    index += 1;
    onProgress?.({ type: "group_start", groupKey: group.groupKey, index, total: approved.length });

    const result = await driver.createDraft(group, credentials);
    const outcome: GroupOutcome = result.ok
      ? {
          groupKey: group.groupKey,
          success: result.value.success,
          referenceNo: result.value.referenceNo,
          message: result.value.message,
        }
      : { groupKey: group.groupKey, success: false, referenceNo: null, message: result.error };

    outcomes.push(outcome);
    onProgress?.({ type: "group_done", outcome });
  }

  const succeeded = outcomes.filter((o) => o.success).length;
  return { outcomes, total: outcomes.length, succeeded, failed: outcomes.length - succeeded };
}
