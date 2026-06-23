// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App", () => {
  it("renders the config step with a dry-run button", () => {
    render(<App />);
    expect(screen.getByText("UTradeHub Automation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "干跑预览" })).toBeTruthy();
  });
});
