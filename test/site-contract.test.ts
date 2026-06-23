import { describe, expect, it } from "vitest";
import { SITE_DEFAULTS, siteContract } from "../src/adapters/site-contract.js";

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectStrings(child, out);
  }
  return out;
}

describe("siteContract", () => {
  it("declares the key steps", () => {
    expect(siteContract.form.mainFrame).toBeTruthy();
    expect(siteContract.supplier.button).toBeTruthy();
    expect(siteContract.items.openButton.name).toBeTruthy();
    expect(siteContract.save.tempSave.name).toBeTruthy();
  });

  it("has no empty selector or label strings", () => {
    for (const value of collectStrings(siteContract)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("exposes basic-info defaults as contract constants", () => {
    expect(SITE_DEFAULTS).toEqual({ receiver: "EKTNET@", materialType: "2AJ", currency: "KRW" });
  });
});
