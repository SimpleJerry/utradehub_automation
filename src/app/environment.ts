export interface EnvIssue {
  key: string;
  message: string;
}

export interface EnvironmentInputs {
  hasChrome: boolean;
  llmApiKey: string | undefined;
}

/** Pure: turn environment facts into blocking issues to surface before a run. */
export function checkEnvironment(inputs: EnvironmentInputs): EnvIssue[] {
  const issues: EnvIssue[] = [];
  if (!inputs.hasChrome) {
    issues.push({
      key: "chrome",
      message: "未检测到系统 Chrome（驱动需要 channel:chrome）。请安装 Google Chrome。",
    });
  }
  if (!inputs.llmApiKey || inputs.llmApiKey.trim() === "") {
    issues.push({ key: "llm", message: "缺少 LLM_API_KEY（PDF 抽取需要）。" });
  }
  return issues;
}
