import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import type { z } from "zod";
import type { LlmProvider } from "../ports/llm.js";

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
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
    const { object } = await generateObject({
      model: this.provider(this.modelId),
      schema,
      system,
      prompt,
      temperature: 0,
    });
    return object;
  }
}
