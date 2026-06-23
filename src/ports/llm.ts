import type { z } from "zod";

/** Vendor-agnostic structured-generation port. Adapters wrap a concrete LLM SDK. */
export interface LlmProvider {
  generateObject<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T>;
}
