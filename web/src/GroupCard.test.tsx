// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupCard } from "./GroupCard.js";
import { type GroupPreview } from "./api.js";

const baseGroup: GroupPreview = {
  groupKey: "acme",
  payToVendorNameEn: "Acme",
  supplierNameKo: "에이씨엠이",
  hsCode: "1234",
  sourceFiles: ["po.pdf"],
  lineItems: [
    {
      description: "WIDGET X",
      quantity: 10,
      unitPrice: 500,
      docNumber: "INV-001",
      documentDate: "2026-01-01",
    },
  ],
  isValid: true,
  missingFields: [],
  droppedLineItems: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GroupCard", () => {
  it("renders supplierNameKo as heading", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText("에이씨엠이")).toBeTruthy();
  });

  it("renders payToVendorNameEn in parentheses alongside Korean name", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText(/Acme/)).toBeTruthy();
  });

  it("renders HS code", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText(/HS: 1234/)).toBeTruthy();
  });

  it("shows 校验通过 for valid group", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText(/校验通过/)).toBeTruthy();
  });

  it("shows 缺字段 for invalid group and disables checkbox", () => {
    const invalidGroup: GroupPreview = {
      ...baseGroup,
      isValid: false,
      missingFields: ["hsCode"],
    };
    render(<GroupCard group={invalidGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText(/缺字段: hsCode/)).toBeTruthy();
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it("checkbox is enabled for valid group", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.disabled).toBe(false);
  });

  it("calls onApprovedChange when checkbox toggled", () => {
    const onApprovedChange = vi.fn();
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={onApprovedChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onApprovedChange).toHaveBeenCalledWith(true);
  });

  it("renders line item content in table", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText("WIDGET X")).toBeTruthy();
    expect(screen.getByText("INV-001")).toBeTruthy();
    expect(screen.getByText("2026-01-01")).toBeTruthy();
  });

  it("shows dropped line items alert with role=alert", () => {
    const groupWithDropped: GroupPreview = {
      ...baseGroup,
      droppedLineItems: [{ description: "GADGET B", reasons: ["quantity", "unitPrice"] }],
    };
    render(<GroupCard group={groupWithDropped} approved={false} onApprovedChange={vi.fn()} />);
    const alerts = screen.getAllByRole("alert");
    const droppedAlert = alerts.find((el) => el.textContent?.includes("GADGET B"));
    expect(droppedAlert).toBeTruthy();
    expect(droppedAlert?.textContent).toMatch(/以下行项目提交时会被跳过/);
    expect(droppedAlert?.textContent).toMatch(/quantity/);
    expect(droppedAlert?.textContent).toMatch(/unitPrice/);
  });

  it("does not render alert when droppedLineItems is empty", () => {
    render(<GroupCard group={baseGroup} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows — for null hsCode", () => {
    const noHs: GroupPreview = { ...baseGroup, hsCode: null };
    render(<GroupCard group={noHs} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText(/HS: —/)).toBeTruthy();
  });

  it("falls back to groupKey when both names are null", () => {
    const noNames: GroupPreview = {
      ...baseGroup,
      supplierNameKo: null,
      payToVendorNameEn: null,
    };
    render(<GroupCard group={noNames} approved={false} onApprovedChange={vi.fn()} />);
    expect(screen.getByText("acme")).toBeTruthy();
  });
});
