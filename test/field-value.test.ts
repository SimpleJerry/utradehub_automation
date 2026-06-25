import { describe, expect, it } from "vitest";
import { numericValueDiffers, totalsArePopulated } from "../src/adapters/field-value.js";

describe("numericValueDiffers", () => {
  it("treats a server-echoed thousands-separated value as equal", () => {
    expect(numericValueDiffers("65,247.6", "65247.6")).toBe(false);
    expect(numericValueDiffers("1,000", "1000")).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    expect(numericValueDiffers("  100 ", "100")).toBe(false);
  });

  it("flags a value the site clobbered to a different number", () => {
    expect(numericValueDiffers("1", "100")).toBe(true);
    expect(numericValueDiffers("1", "25")).toBe(true);
  });

  it("flags an emptied field", () => {
    expect(numericValueDiffers("", "100")).toBe(true);
  });

  it("treats identical values as equal", () => {
    expect(numericValueDiffers("350", "350")).toBe(false);
  });
});

describe("totalsArePopulated", () => {
  it("is false until the async fnc_linepop callback writes the totals", () => {
    // Pre-callback state: the parent form fields are still empty → must NOT proceed to 임시저장.
    expect(totalsArePopulated("", "")).toBe(false);
    expect(totalsArePopulated("100", "")).toBe(false);
    expect(totalsArePopulated("", "65,247.60")).toBe(false);
  });

  it("rejects zero placeholders as not-yet-populated", () => {
    // A "0"/"0.00" total after adding rows is just as wrong to commit as a blank.
    expect(totalsArePopulated("0", "0")).toBe(false);
    expect(totalsArePopulated("0.00", "0.00")).toBe(false);
    expect(totalsArePopulated("100", "0.00")).toBe(false);
  });

  it("is true once both totals are present and non-zero", () => {
    expect(totalsArePopulated("100", "65247.60")).toBe(true);
  });

  it("reads the site's thousands-separated totals as populated", () => {
    expect(totalsArePopulated("1,234", "1,234,567.89")).toBe(true);
  });
});
