import { err, ok, type Result } from "../core/result.js";
import type { SiteCredentials } from "../ports/browser-driver.js";

/**
 * Read uTradeHub credentials from the environment. Used ONLY by the gated integration
 * test on a developer machine. The app proper passes credentials in memory (never reads
 * or persists them here).
 */
export function credentialsFromEnv(env: NodeJS.ProcessEnv = process.env): Result<SiteCredentials> {
  const baseUrl = (env.SITE_BASE_URL ?? "").trim();
  const manualLogin = env.SITE_MANUAL_LOGIN === "1";
  const username = (env.SITE_USERNAME ?? "").trim();
  const password = (env.SITE_PASSWORD ?? "").trim();

  const missing: string[] = [];
  if (!baseUrl) missing.push("SITE_BASE_URL");
  if (!manualLogin) {
    if (!username) missing.push("SITE_USERNAME");
    if (!password) missing.push("SITE_PASSWORD");
  }
  if (missing.length > 0) return err(`missing_credentials: ${missing.join(",")}`);

  if (manualLogin) return ok({ baseUrl, loginMode: "manual" });
  return ok({ baseUrl, username, password });
}
