import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import type { z } from "zod";
import type { LlmProvider } from "../ports/llm.js";

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/**
 * Render an LLM SDK error into a diagnosable message. The AI SDK's NoObjectGeneratedError
 * carries the raw model output (`text`) and the validation detail (`cause`) — the parts that
 * say *why* a response failed the schema — behind an otherwise generic message.
 */
export function describeLlmError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; cause?: unknown; text?: unknown };
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message !== "") parts.push(e.message);
    if (e.cause != null) {
      const cause = e.cause as { message?: unknown };
      parts.push(`cause: ${typeof cause.message === "string" ? cause.message : String(e.cause)}`);
    }
    if (typeof e.text === "string" && e.text !== "") parts.push(`raw: ${e.text.slice(0, 1000)}`);
    if (parts.length > 0) return parts.join(" | ");
  }
  return String(error);
}

/** Vendor-agnostic LLM provider over any OpenAI-compatible endpoint (DeepSeek, OpenAI, Ollama, ...). */
export class AiSdkLlmProvider implements LlmProvider {
  private readonly provider: ReturnType<typeof createOpenAICompatible>;
  private readonly modelId: string;

  constructor(config: LlmConfig) {
    this.provider = createOpenAICompatible({
      name: "llm",
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
    this.modelId = config.model;
  }

  async generateObject<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
    try {
      const { object } = await generateObject({
        model: this.provider(this.modelId),
        schema,
        system,
        prompt,
        temperature: 0,
      });
      return object;
    } catch (error) {
      throw new Error(describeLlmError(error), { cause: error });
    }
  }
}
