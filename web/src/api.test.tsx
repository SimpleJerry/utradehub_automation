import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "./api.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api run", () => {
  it("sends operatorConfirmed with the run request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ outcomes: [], total: 0, succeeded: 0, failed: 0 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await run("session-1", ["acme"], true, {
      baseUrl: "https://www.utradehub.or.kr/",
      loginMode: "manual",
      username: "",
      password: "",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/run",
      expect.objectContaining({
        body: JSON.stringify({
          sessionId: "session-1",
          approvedGroupKeys: ["acme"],
          operatorConfirmed: true,
          credentials: {
            baseUrl: "https://www.utradehub.or.kr/",
            loginMode: "manual",
            username: "",
            password: "",
          },
        }),
      }),
    );
  });

  it("returns typed API error responses instead of coercing them to a BatchReport", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ error: "operator_confirmation_required" }),
      })),
    );

    await expect(
      run("session-1", ["acme"], false, {
        baseUrl: "https://www.utradehub.or.kr/",
        loginMode: "manual",
        username: "",
        password: "",
      }),
    ).resolves.toEqual({ error: "operator_confirmation_required" });
  });
});
