import type { SubmissionRecord } from "../core/model.js";
import type { Result } from "../core/result.js";

export type SiteCredentials =
  | {
      baseUrl: string;
      loginMode?: "automatic";
      username: string;
      password: string;
    }
  | {
      baseUrl: string;
      loginMode: "manual";
    };

export interface SaveResult {
  success: boolean;
  referenceNo: string | null;
  message: string;
}

/**
 * Drives uTradeHub to create a 임시저장 (temporary-save) draft for one supplier group.
 * Credentials are passed in (memory only) and never persisted by implementations.
 */
export interface BrowserDriver {
  createDraft(record: SubmissionRecord, credentials: SiteCredentials): Promise<Result<SaveResult>>;
}
