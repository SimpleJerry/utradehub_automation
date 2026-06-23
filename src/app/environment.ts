export interface EnvIssue {
  key: string;
  message: string;
}

export interface EnvironmentInputs {
  hasChrome: boolean;
}

/**
 * Pure: turn environment facts into blocking issues to surface before a run.
 * Only covers environmental prerequisites (system Chrome). The LLM API key and supplier
 * mapping are operator-supplied inputs validated in the UI before preview, not here.
 */
export function checkEnvironment(inputs: EnvironmentInputs): EnvIssue[] {
  const issues: EnvIssue[] = [];
  if (!inputs.hasChrome) {
    issues.push({
      key: "chrome",
      message: "未检测到系统 Chrome（驱动需要 channel:chrome）。请安装 Google Chrome。",
    });
  }
  return issues;
}
