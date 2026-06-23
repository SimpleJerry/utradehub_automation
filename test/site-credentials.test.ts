import { describe, expect, it } from "vitest";
import { credentialsFromEnv } from "../src/adapters/site-credentials.js";

describe("credentialsFromEnv", () => {
  it("reads complete credentials", () => {
    const result = credentialsFromEnv({
      SITE_BASE_URL: "https://www.utradehub.or.kr/",
      SITE_USERNAME: "user",
      SITE_PASSWORD: "secret",
    });
    expect(result.ok).toBe(true);
  });

  it("reports missing keys", () => {
    const result = credentialsFromEnv({});
    expect(result.ok).toBe(false);
  });
});
