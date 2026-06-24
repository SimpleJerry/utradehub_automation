import { describe, expect, it } from "vitest";
import { numericValueDiffers } from "../src/adapters/field-value.js";

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
