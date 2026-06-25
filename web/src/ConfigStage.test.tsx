// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigStage } from "./ConfigStage.js";

const baseProps = {
  credentials: { baseUrl: "https://www.utradehub.or.kr/" },
  mappingFileName: "",
  llmApiKey: "",
  llmModel: "",
  llmBaseUrl: "",
  showAdvanced: false,
  pdfs: [],
  busy: false,
  onMappingFile: vi.fn(),
  onLlmApiKeyChange: vi.fn(),
  onLlmModelChange: vi.fn(),
  onLlmBaseUrlChange: vi.fn(),
  onToggleAdvanced: vi.fn(),
  onPdfFiles: vi.fn(),
  onPreview: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConfigStage", () => {
  it("renders config heading and required fields", () => {
    render(<ConfigStage {...baseProps} />);
    expect(screen.getByText(/1\. 配置/)).toBeTruthy();
    expect(screen.getByLabelText("供应商映射 CSV")).toBeTruthy();
    expect(screen.getByLabelText("LLM API Key")).toBeTruthy();
    expect(screen.getByRole("button", { name: "干跑预览" })).toBeTruthy();
  });

  it("disables preview button when nothing is provided", () => {
    render(<ConfigStage {...baseProps} />);
    const btn = screen.getByRole("button", { name: "干跑预览" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables preview button when mapping, key, and PDFs are all present", () => {
    render(
      <ConfigStage
        {...baseProps}
        mappingFileName="map.csv"
        llmApiKey="sk-test"
        pdfs={[{ sourceFile: "a.pdf", base64: "abc" }]}
      />,
    );
    const btn = screen.getByRole("button", { name: "干跑预览" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("shows 未选择映射文件 when no mapping file loaded", () => {
    render(<ConfigStage {...baseProps} />);
    expect(screen.getByText("未选择映射文件")).toBeTruthy();
  });

  it("shows loaded filename when mappingFileName is set", () => {
    render(<ConfigStage {...baseProps} mappingFileName="vendors.csv" />);
    expect(screen.getByText(/已加载映射：vendors\.csv/)).toBeTruthy();
  });

  it("shows advanced fields when showAdvanced is true", () => {
    render(<ConfigStage {...baseProps} showAdvanced={true} />);
    expect(screen.getByLabelText("LLM 模型")).toBeTruthy();
    expect(screen.getByLabelText("LLM Base URL")).toBeTruthy();
  });

  it("hides advanced fields when showAdvanced is false", () => {
    render(<ConfigStage {...baseProps} showAdvanced={false} />);
    expect(screen.queryByLabelText("LLM 模型")).toBeNull();
    expect(screen.queryByLabelText("LLM Base URL")).toBeNull();
  });

  it("calls onToggleAdvanced when toggle button is clicked", () => {
    const onToggleAdvanced = vi.fn();
    render(<ConfigStage {...baseProps} onToggleAdvanced={onToggleAdvanced} />);
    fireEvent.click(screen.getByRole("button", { name: /高级（可选）/ }));
    expect(onToggleAdvanced).toHaveBeenCalledOnce();
  });

  it("calls onLlmApiKeyChange when API key input changes", () => {
    const onLlmApiKeyChange = vi.fn();
    render(<ConfigStage {...baseProps} onLlmApiKeyChange={onLlmApiKeyChange} />);
    fireEvent.change(screen.getByLabelText("LLM API Key"), { target: { value: "sk-new" } });
    expect(onLlmApiKeyChange).toHaveBeenCalledWith("sk-new");
  });

  it("calls onPreview when preview button clicked and enabled", () => {
    const onPreview = vi.fn();
    render(
      <ConfigStage
        {...baseProps}
        mappingFileName="map.csv"
        llmApiKey="sk-test"
        pdfs={[{ sourceFile: "a.pdf", base64: "abc" }]}
        onPreview={onPreview}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "干跑预览" }));
    expect(onPreview).toHaveBeenCalledOnce();
  });

  it("disables preview button while busy", () => {
    render(
      <ConfigStage
        {...baseProps}
        mappingFileName="map.csv"
        llmApiKey="sk-test"
        pdfs={[{ sourceFile: "a.pdf", base64: "abc" }]}
        busy={true}
      />,
    );
    const btn = screen.getByRole("button", { name: "干跑预览" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows PDF count", () => {
    render(
      <ConfigStage
        {...baseProps}
        pdfs={[
          { sourceFile: "a.pdf", base64: "abc" },
          { sourceFile: "b.pdf", base64: "def" },
        ]}
      />,
    );
    expect(screen.getByText(/2 个 PDF 已就绪/)).toBeTruthy();
  });
});
