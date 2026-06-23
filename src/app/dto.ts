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

export interface GroupPreview {
  groupKey: string;
  payToVendorNameEn: string | null;
  supplierNameKo: string | null;
  hsCode: string | null;
  sourceFiles: string[];
  lineItems: LineItem[];
  isValid: boolean;
  missingFields: string[];
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
