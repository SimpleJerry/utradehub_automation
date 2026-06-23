import { existsSync } from "node:fs";
import { LlmExtractor } from "../../adapters/llm-extractor.js";
import { AiSdkLlmProvider } from "../../adapters/llm-provider.js";
import { UnpdfTextExtractor } from "../../adapters/pdf-text.js";
import { PlaywrightDriver } from "../../adapters/playwright-driver.js";
import { parseVendorMapping } from "../../adapters/vendor-mapping-loader.js";
import type { Result } from "../../core/result.js";
import type { VendorMapping } from "../../core/vendor-mapping.js";
import type { BrowserDriver } from "../../ports/browser-driver.js";
import type { Extractor } from "../../ports/extractor.js";
import type { LlmRequestConfig } from "../dto.js";
import { checkEnvironment, type EnvIssue } from "../environment.js";

/**
 * Defaults for the non-sensitive LLM config. The API key is always operator-supplied
 * (entered in the UI per session, in memory only — never read from the environment or disk).
 */
export const LLM_DEFAULTS = {
  model: "deepseek-v4-flash",
  baseUrl: "https://api.deepseek.com",
} as const;

export interface ServerDeps {
  /** Build an extractor from the operator-supplied LLM config (per request). */
  makeExtractor: (llm: LlmRequestConfig) => Extractor;
  driver: BrowserDriver;
  parseMapping: (csv: string) => Result<VendorMapping>;
  detectEnvironment: () => Promise<EnvIssue[]>;
}

function hasSystemChrome(): boolean {
  const candidates = [
    `${process.env.PROGRAMFILES ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  return candidates.some((path) => existsSync(path));
}

export function createProductionDeps(): ServerDeps {
  return {
    makeExtractor: (llm) =>
      new LlmExtractor(
        new UnpdfTextExtractor(),
        new AiSdkLlmProvider({
          apiKey: llm.apiKey,
          model: llm.model?.trim() ? llm.model : LLM_DEFAULTS.model,
          baseUrl: llm.baseUrl?.trim() ? llm.baseUrl : LLM_DEFAULTS.baseUrl,
        }),
      ),
    driver: new PlaywrightDriver(),
    parseMapping: (csv) => parseVendorMapping(csv),
    detectEnvironment: () => Promise.resolve(checkEnvironment({ hasChrome: hasSystemChrome() })),
  };
}
