import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeWhitespace } from "../src/core/text.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, "fixtures", "normalize");

describe("normalizeWhitespace", () => {
  it("collapses and trims whitespace", () => {
    expect(normalizeWhitespace("  a   b\tc \n")).toBe("a b c");
  });

  it("matches the golden fixture", () => {
    const input = readFileSync(join(fixtureDir, "input.txt"), "utf8");
    const expected = readFileSync(join(fixtureDir, "expected.txt"), "utf8");
    expect(normalizeWhitespace(input)).toBe(expected);
  });
});
