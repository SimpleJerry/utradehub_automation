import { type CSSProperties } from "react";
import { type DroppedLineItem, type GroupPreview } from "./api.js";

const cell: CSSProperties = { border: "1px solid #ddd", padding: "4px 8px", textAlign: "left" };
const cellNum: CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
const headCell: CSSProperties = { ...cell, background: "#f5f5f5", fontWeight: 600 };
const headCellNum: CSSProperties = { ...headCell, textAlign: "right" };

/** Group separators so amounts are scannable; keeps the decimals the model returned. */
function fmtNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

interface Props {
  group: GroupPreview;
  approved: boolean;
  onApprovedChange: (checked: boolean) => void;
}

export function GroupCard({ group: g, approved, onApprovedChange }: Props) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "0.6rem 0.75rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
          <input
            type="checkbox"
            disabled={!g.isValid}
            checked={approved}
            onChange={(e) => onApprovedChange(e.target.checked)}
          />
          批准
        </label>
        <strong style={{ fontSize: "1.05em" }}>
          {g.supplierNameKo ?? g.payToVendorNameEn ?? g.groupKey}
        </strong>
        {g.supplierNameKo !== null && g.payToVendorNameEn !== null && (
          <span style={{ color: "#666" }}>（{g.payToVendorNameEn}）</span>
        )}
        <span>HS: {g.hsCode ?? "—"}</span>
        <span style={{ color: g.isValid ? "#070" : "#b00", fontWeight: 600 }}>
          {g.isValid ? "✓ 校验通过" : `✗ 缺字段: ${g.missingFields.join("、")}`}
        </span>
        <span style={{ color: "#888", marginLeft: "auto", fontSize: "0.9em" }}>
          {g.lineItems.length} 行 · 来源 {g.sourceFiles.join("、")}
        </span>
      </div>
      {g.droppedLineItems.length > 0 && (
        <div
          role="alert"
          style={{
            color: "#b00",
            background: "#fff5f5",
            border: "1px solid #f5c6c6",
            borderRadius: 4,
            padding: "6px 10px",
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
            以下行项目提交时会被跳过，不会进入草稿（请核对）：
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {g.droppedLineItems.map((d: DroppedLineItem, i: number) => (
              <li key={`${g.groupKey}-dropped-${i}`}>
                {d.description}（缺失字段：{d.reasons.join("、")}）
              </li>
            ))}
          </ul>
        </div>
      )}
      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
        <thead>
          <tr>
            <th style={headCell}>单据号</th>
            <th style={headCell}>单据日期</th>
            <th style={headCell}>品名</th>
            <th style={headCellNum}>数量</th>
            <th style={headCellNum}>单价</th>
          </tr>
        </thead>
        <tbody>
          {g.lineItems.map((item, i) => (
            <tr key={`${g.groupKey}#${i}`}>
              <td style={cell}>{item.docNumber ?? "—"}</td>
              <td style={cell}>{item.documentDate ?? "—"}</td>
              <td style={cell}>{item.description}</td>
              <td style={cellNum}>{fmtNumber(item.quantity)}</td>
              <td style={cellNum}>{fmtNumber(item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
