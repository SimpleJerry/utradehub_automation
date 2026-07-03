export interface EnvIssue {
  key: string;
  message: string;
}

export interface PreviewLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  // Provenance stamped during grouping; present on real extractions, optional for safety.
  docNumber?: string;
  documentDate?: string;
  sourceFile?: string;
}

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
  lineItems: PreviewLineItem[];
  isValid: boolean;
  missingFields: string[];
  /** Rows that buildSubmissionPlan will silently skip; empty when all rows will submit. */
  droppedLineItems: DroppedLineItem[];
}

export interface ExtractionFailure {
  sourceFile: string;
  error: string;
}

/** Success carries groups + per-file failures; a mapping/parse error returns only `error`. */
export type PreviewResponse =
  | { sessionId: string; groups: GroupPreview[]; extractionFailures: ExtractionFailure[] }
  | { error: string };

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

export interface Credentials {
  baseUrl: string;
  loginMode?: "automatic" | "manual";
  username: string;
  password: string;
}

export interface PdfUpload {
  sourceFile: string;
  base64: string;
}

/** LLM config supplied per request; apiKey is held in memory only (never persisted). */
export interface LlmRequestConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchEnvironment(): Promise<EnvIssue[]> {
  const res = await fetch("/api/environment");
  const data = (await res.json()) as { issues: EnvIssue[] };
  return data.issues;
}

export function preview(
  mappingCsv: string,
  pdfs: PdfUpload[],
  llm: LlmRequestConfig,
): Promise<PreviewResponse> {
  return postJson<PreviewResponse>("/api/preview", { mappingCsv, pdfs, llm });
}

export function run(
  sessionId: string,
  approvedGroupKeys: string[],
  credentials: Credentials,
): Promise<BatchReport> {
  return postJson<BatchReport>("/api/run", { sessionId, approvedGroupKeys, credentials });
}
