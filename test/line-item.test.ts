import { describe, expect, it } from "vitest";
import { isSubmittableLineItem, lineItemRejections } from "../src/core/line-item.js";
import type { LineItem } from "../src/core/model.js";

function item(overrides: Partial<LineItem> = {}): LineItem {
  return { description: "Widget", quantity: 2, unitPrice: 50, ...overrides };
}

describe("lineItemRejections", () => {
  it("returns no reasons for a complete line item", () => {
    expect(lineItemRejections(item())).toEqual([]);
  });

  it("flags an empty / whitespace-only description", () => {
    expect(lineItemRejections(item({ description: "   " }))).toEqual(["description"]);
  });

  it("flags a non-finite quantity", () => {
    expect(lineItemRejections(item({ quantity: Number.NaN }))).toEqual(["quantity"]);
  });

  it("flags a non-finite unit price", () => {
    expect(lineItemRejections(item({ unitPrice: Number.NaN }))).toEqual(["unitPrice"]);
  });

  it("lists every failing field, in field order, for a fully invalid item", () => {
    expect(
      lineItemRejections(item({ description: "", quantity: Number.NaN, unitPrice: Number.NaN })),
    ).toEqual(["description", "quantity", "unitPrice"]);
  });
});

describe("isSubmittableLineItem", () => {
  it("is true when there are no rejections", () => {
    expect(isSubmittableLineItem(item())).toBe(true);
  });

  it("is false when any required field is missing", () => {
    expect(isSubmittableLineItem(item({ quantity: Number.NaN }))).toBe(false);
  });
});
