import type { LineItem } from "../core/model.js";

/** LLM config supplied per request by the operator. apiKey is in-memory only, never persisted. */
export interface LlmRequestConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ExtractionFailure {
  sourceFile: string;
  error: string;
}

/** A previewed row that submit would silently skip, with the failing field identifiers. */
export interface DroppedLineItem {
  description: string;
  reasons: string[];
}

export interface GroupPreview {
  groupKey: string;
  payToVendorNameEn: string | null;
  supplierNameKo: string | null;
  hsCode: string | null;
  sourceFiles: string[];
  lineItems: LineItem[];
  isValid: boolean;
  missingFields: string[];
  /** Rows shown in `lineItems` that buildSubmissionPlan will drop (empty when all submit). */
  droppedLineItems: DroppedLineItem[];
}

export interface PreviewResult {
  groups: GroupPreview[];
  extractionFailures: ExtractionFailure[];
}

export interface GroupOutcome {
  groupKey: string;
  success: boolean;
  referenceNo: string | null;
  message: string;
}

export interface BatchReport {
  outcomes: GroupOutcome[];
  total: number;
  succeeded: number;
  failed: number;
}
