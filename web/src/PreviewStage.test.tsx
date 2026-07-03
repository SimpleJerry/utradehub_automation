// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewStage } from "./PreviewStage.js";
import { type Credentials, type GroupPreview } from "./api.js";

const baseCredentials: Credentials = {
  baseUrl: "https://www.utradehub.or.kr/",
  loginMode: "automatic",
  username: "",
  password: "",
};

const sampleGroup: GroupPreview = {
  groupKey: "acme",
  payToVendorNameEn: "Acme",
  supplierNameKo: "에이씨엠이",
  hsCode: "1234",
  sourceFiles: ["po.pdf"],
  lineItems: [
    {
      description: "WIDGET X",
      quantity: 5,
      unitPrice: 200,
      docNumber: "INV-001",
      documentDate: "2026-01-01",
    },
  ],
  isValid: true,
  missingFields: [],
  droppedLineItems: [],
};

const baseProps = {
  groups: [],
  extractionFailures: [],
  approved: {},
  confirmed: false,
  credentials: baseCredentials,
  busy: false,
  onApprovedChange: vi.fn(),
  onConfirmedChange: vi.fn(),
  onCredentialsChange: vi.fn(),
  onRun: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PreviewStage", () => {
  it("renders preview heading", () => {
    render(<PreviewStage {...baseProps} />);
    expect(screen.getByText(/2\. 干跑预览/)).toBeTruthy();
  });

  it("shows empty state message when no groups", () => {
    render(<PreviewStage {...baseProps} />);
    expect(screen.getByText(/没有可预览的分组/)).toBeTruthy();
  });

  it("renders extraction failures with role=alert", () => {
    render(
      <PreviewStage
        {...baseProps}
        extractionFailures={[{ sourceFile: "bad.pdf", error: "empty_pdf_text" }]}
      />,
    );
    const alerts = screen.getAllByRole("alert");
    const failAlert = alerts.find((el) => el.textContent?.includes("bad.pdf"));
    expect(failAlert).toBeTruthy();
    expect(failAlert?.textContent).toMatch(/empty_pdf_text/);
  });

  it("renders group cards", () => {
    render(<PreviewStage {...baseProps} groups={[sampleGroup]} approved={{ acme: true }} />);
    expect(screen.getByText("에이씨엠이")).toBeTruthy();
    expect(screen.getByText("WIDGET X")).toBeTruthy();
  });

  it("run button is disabled when not confirmed", () => {
    render(
      <PreviewStage
        {...baseProps}
        credentials={{ ...baseCredentials, username: "user", password: "pass" }}
        confirmed={false}
      />,
    );
    const btn = screen.getByRole("button", { name: "确认并运行" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("run button is disabled when credentials are missing", () => {
    render(<PreviewStage {...baseProps} confirmed={true} />);
    const btn = screen.getByRole("button", { name: "确认并运行" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("run button is enabled in manual login mode without credentials", () => {
    render(
      <PreviewStage
        {...baseProps}
        confirmed={true}
        credentials={{ ...baseCredentials, loginMode: "manual" }}
      />,
    );
    const btn = screen.getByRole("button", { name: "确认并运行" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("run button is enabled when confirmed and credentials provided", () => {
    render(
      <PreviewStage
        {...baseProps}
        confirmed={true}
        credentials={{ ...baseCredentials, username: "user", password: "pass" }}
      />,
    );
    const btn = screen.getByRole("button", { name: "确认并运行" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onRun when run button clicked while enabled", () => {
    const onRun = vi.fn();
    render(
      <PreviewStage
        {...baseProps}
        confirmed={true}
        credentials={{ ...baseCredentials, username: "user", password: "pass" }}
        onRun={onRun}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "确认并运行" }));
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("calls onConfirmedChange when confirmation checkbox toggled", () => {
    const onConfirmedChange = vi.fn();
    render(<PreviewStage {...baseProps} onConfirmedChange={onConfirmedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /我已核对预览/ }));
    expect(onConfirmedChange).toHaveBeenCalledWith(true);
  });

  it("calls onCredentialsChange when username changes", () => {
    const onCredentialsChange = vi.fn();
    render(<PreviewStage {...baseProps} onCredentialsChange={onCredentialsChange} />);
    fireEvent.change(screen.getByPlaceholderText("账号"), {
      target: { value: "testuser" },
    });
    expect(onCredentialsChange).toHaveBeenCalledWith({ username: "testuser" });
  });

  it("calls onCredentialsChange when manual login toggles", () => {
    const onCredentialsChange = vi.fn();
    render(<PreviewStage {...baseProps} onCredentialsChange={onCredentialsChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "在 Chrome 中手动登录" }));
    expect(onCredentialsChange).toHaveBeenCalledWith({ loginMode: "manual" });
  });

  it("shows confirmation checkbox with correct label", () => {
    render(<PreviewStage {...baseProps} />);
    expect(screen.getByText(/我已核对预览，确认驱动建草稿（不会正式提交）/)).toBeTruthy();
  });

  it("login section shows in-session-only note", () => {
    render(<PreviewStage {...baseProps} />);
    expect(screen.getByText(/仅本次会话，不保存/)).toBeTruthy();
  });
});
