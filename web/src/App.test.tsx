// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.js";

afterEach(cleanup);

describe("App", () => {
  it("renders the config step with mapping upload and LLM key fields", () => {
    render(<App />);
    expect(screen.getByText("UTradeHub Automation")).toBeTruthy();
    expect(screen.getByLabelText("供应商映射 CSV")).toBeTruthy();
    expect(screen.getByLabelText("LLM API Key")).toBeTruthy();
  });

  it("disables dry-run preview until mapping, key, and PDFs are provided", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "干跑预览" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
