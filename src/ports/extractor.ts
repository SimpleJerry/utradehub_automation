import type { PurchaseOrder } from "../core/model.js";
import type { Result } from "../core/result.js";

export interface ExtractInput {
  sourceFile: string;
  pdf: Uint8Array;
}

export interface Extractor {
  extract(input: ExtractInput): Promise<Result<PurchaseOrder>>;
}
