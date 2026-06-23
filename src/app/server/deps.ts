import { existsSync } from "node:fs";
import { LlmExtractor } from "../../adapters/llm-extractor.js";
import { AiSdkLlmProvider, type LlmConfig } from "../../adapters/llm-provider.js";
import { UnpdfTextExtractor } from "../../adapters/pdf-text.js";
import { PlaywrightDriver } from "../../adapters/playwright-driver.js";
import { parseVendorMapping } from "../../adapters/vendor-mapping-loader.js";
import type { Result } from "../../core/result.js";
import type { VendorMapping } from "../../core/vendor-mapping.js";
import type { BrowserDriver } from "../../ports/browser-driver.js";
import type { Extractor } from "../../ports/extractor.js";
import { checkEnvironment, type EnvIssue } from "../environment.js";

export interface ServerDeps {
  extractor: Extractor;
  driver: BrowserDriver;
  parseMapping: (csv: string) => Result<VendorMapping>;
  detectEnvironment: () => Promise<EnvIssue[]>;
}

function loadLlmConfig(): LlmConfig {
  return {
    baseUrl: (process.env.LLM_BASE_URL ?? "").trim(),
    model: (process.env.LLM_MODEL ?? "").trim(),
    apiKey: (process.env.LLM_API_KEY ?? "").trim(),
  };
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
  const extractor = new LlmExtractor(
    new UnpdfTextExtractor(),
    new AiSdkLlmProvider(loadLlmConfig()),
  );
  const driver = new PlaywrightDriver();
  return {
    extractor,
    driver,
    parseMapping: (csv) => parseVendorMapping(csv),
    detectEnvironment: () =>
      Promise.resolve(
        checkEnvironment({ hasChrome: hasSystemChrome(), llmApiKey: process.env.LLM_API_KEY }),
      ),
  };
}
