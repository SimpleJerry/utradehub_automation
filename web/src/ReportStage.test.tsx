// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReportStage } from "./ReportStage.js";
import { type BatchReport } from "./api.js";

afterEach(() => {
  cleanup();
});

const successReport: BatchReport = {
  outcomes: [
    {
      groupKey: "acme",
      success: true,
      referenceNo: "REF-001",
      message: "초안 생성 완료",
    },
  ],
  total: 1,
  succeeded: 1,
  failed: 0,
};

const mixedReport: BatchReport = {
  outcomes: [
    {
      groupKey: "acme",
      success: true,
      referenceNo: "REF-001",
      message: "초안 생성 완료",
    },
    {
      groupKey: "betacorp",
      success: false,
      referenceNo: null,
      message: "login_failed",
    },
  ],
  total: 2,
  succeeded: 1,
  failed: 1,
};

describe("ReportStage", () => {
  it("renders report heading", () => {
    render(<ReportStage report={successReport} />);
    expect(screen.getByText(/3\. 结果/)).toBeTruthy();
  });

  it("shows success/failed/total summary", () => {
    render(<ReportStage report={mixedReport} />);
    expect(screen.getByText(/成功 1 \/ 失败 1 \/ 共 2/)).toBeTruthy();
  });

  it("renders each outcome with its groupKey", () => {
    render(<ReportStage report={mixedReport} />);
    expect(screen.getByText(/acme/)).toBeTruthy();
    expect(screen.getByText(/betacorp/)).toBeTruthy();
  });

  it("shows 成功 for successful outcome in the outcome list", () => {
    render(<ReportStage report={successReport} />);
    const items = screen.getAllByText(/成功/);
    // At least one list item should contain 成功
    expect(items.length).toBeGreaterThanOrEqual(1);
    // The outcome list item text includes the group key and 成功 label
    expect(items.some((el) => el.textContent?.includes("acme"))).toBe(true);
  });

  it("shows 失败 for failed outcome", () => {
    render(<ReportStage report={mixedReport} />);
    expect(screen.getByText(/失败 — login_failed/)).toBeTruthy();
  });

  it("shows referenceNo when present", () => {
    render(<ReportStage report={successReport} />);
    expect(screen.getByText(/#REF-001/)).toBeTruthy();
  });

  it("does not show referenceNo parenthetical when null", () => {
    render(<ReportStage report={mixedReport} />);
    const betaItem = screen.getByText(/betacorp/);
    expect(betaItem.textContent).not.toMatch(/#/);
  });
});
