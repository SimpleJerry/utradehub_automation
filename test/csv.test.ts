import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/core/csv.js";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted commas", () => {
    expect(parseCsv('a,b\n"x,y",z')).toEqual([
      ["a", "b"],
      ["x,y", "z"],
    ]);
  });
});
