// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { preview } from "./api.js";

vi.mock("./api.js", () => ({
  preview: vi.fn(),
  run: vi.fn(),
  fetchEnvironment: vi.fn(() => Promise.resolve([])),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Fill mapping CSV, API key, and one PDF so the "干跑预览" button enables, then click it. */
async function runPreview() {
  const csv = new File(
    ["vendor_name_en,supplier_name_ko,hs_code\nAcme,에이씨엠이,1234"],
    "map.csv",
    {
      type: "text/csv",
    },
  );
  const pdf = new File([new Uint8Array([1, 2, 3])], "bad.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("供应商映射 CSV"), { target: { files: [csv] } });
  fireEvent.change(screen.getByLabelText("LLM API Key"), { target: { value: "sk-test" } });
  fireEvent.change(document.querySelector('input[accept="application/pdf"]')!, {
    target: { files: [pdf] },
  });
  const button = screen.getByRole("button", { name: "干跑预览" }) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

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

  it("shows per-file extraction failures returned by the preview", async () => {
    vi.mocked(preview).mockResolvedValueOnce({
      sessionId: "s1",
      groups: [],
      extractionFailures: [{ sourceFile: "bad.pdf", error: "empty_pdf_text" }],
    });
    render(<App />);
    await runPreview();
    expect(await screen.findByText(/bad\.pdf/)).toBeTruthy();
    expect(await screen.findByText(/empty_pdf_text/)).toBeTruthy();
  });

  it("surfaces a mapping/parse error instead of crashing the page", async () => {
    vi.mocked(preview).mockResolvedValueOnce({ error: "mapping_parse_failed: bad header" });
    render(<App />);
    await runPreview();
    expect(await screen.findByText(/mapping_parse_failed: bad header/)).toBeTruthy();
  });

  // The dry run exists so the operator can verify the extracted content before any draft is
  // created. A line-item COUNT is not enough — the actual description / quantity / unit price /
  // source document must be visible for review.
  it("shows each extracted line item's content for review", async () => {
    vi.mocked(preview).mockResolvedValueOnce({
      sessionId: "s1",
      groups: [
        {
          groupKey: "acme",
          payToVendorNameEn: "Acme",
          supplierNameKo: "에이씨엠이",
          hsCode: "1234",
          sourceFiles: ["po.pdf"],
          lineItems: [
            {
              description: "CANNULA COG 360",
              quantity: 350,
              unitPrice: 65247.6,
              docNumber: "PBO-00007960",
              documentDate: "2026-04-27",
            },
          ],
          isValid: true,
          missingFields: [],
        },
      ],
      extractionFailures: [],
    });
    render(<App />);
    await runPreview();
    expect(await screen.findByText(/CANNULA COG 360/)).toBeTruthy();
    expect(await screen.findByText("350")).toBeTruthy();
    expect(await screen.findByText(/65,?247/)).toBeTruthy();
    expect(await screen.findByText(/PBO-00007960/)).toBeTruthy();
  });
});
