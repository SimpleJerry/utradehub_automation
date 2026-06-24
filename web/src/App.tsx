import { useState, type CSSProperties } from "react";
import {
  fetchEnvironment,
  preview,
  run,
  type BatchReport,
  type Credentials,
  type EnvIssue,
  type ExtractionFailure,
  type GroupPreview,
  type PdfUpload,
} from "./api.js";

type Phase = "config" | "preview" | "report";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Group separators so amounts are scannable; keeps the decimals the model returned. */
function fmtNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

const cell: CSSProperties = { border: "1px solid #ddd", padding: "4px 8px", textAlign: "left" };
const cellNum: CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
const headCell: CSSProperties = { ...cell, background: "#f5f5f5", fontWeight: 600 };
const headCellNum: CSSProperties = { ...headCell, textAlign: "right" };

export function App() {
  const [phase, setPhase] = useState<Phase>("config");
  const [mappingCsv, setMappingCsv] = useState("");
  const [mappingFileName, setMappingFileName] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pdfs, setPdfs] = useState<PdfUpload[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [groups, setGroups] = useState<GroupPreview[]>([]);
  const [extractionFailures, setExtractionFailures] = useState<ExtractionFailure[]>([]);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>({
    baseUrl: "https://www.utradehub.or.kr/",
    username: "",
    password: "",
  });
  const [report, setReport] = useState<BatchReport | null>(null);
  const [issues, setIssues] = useState<EnvIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const uploads: PdfUpload[] = [];
    for (const file of Array.from(fileList)) {
      uploads.push({ sourceFile: file.name, base64: toBase64(await file.arrayBuffer()) });
    }
    setPdfs(uploads);
  }

  async function handleMappingFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setMappingCsv(await file.text());
    setMappingFileName(file.name);
  }

  async function handlePreview() {
    setBusy(true);
    setError("");
    try {
      const result = await preview(mappingCsv, pdfs, {
        apiKey: llmApiKey,
        model: llmModel || undefined,
        baseUrl: llmBaseUrl || undefined,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSessionId(result.sessionId);
      setGroups(result.groups);
      setExtractionFailures(result.extractionFailures);
      setApproved(
        Object.fromEntries(result.groups.filter((g) => g.isValid).map((g) => [g.groupKey, true])),
      );
      setConfirmed(false);
      setPhase("preview");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRun() {
    setBusy(true);
    setError("");
    try {
      const keys = groups.filter((g) => approved[g.groupKey]).map((g) => g.groupKey);
      setReport(await run(sessionId, keys, credentials));
      setPhase("report");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{ fontFamily: "sans-serif", maxWidth: 880, margin: "1rem auto", padding: "0 1rem" }}
    >
      <h1>UTradeHub Automation</h1>
      <button onClick={() => void fetchEnvironment().then(setIssues)}>检查运行环境</button>
      {issues.length > 0 && (
        <ul>
          {issues.map((issue) => (
            <li key={issue.key} style={{ color: "#b00" }}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      {error !== "" && <p style={{ color: "#b00" }}>{error}</p>}

      {phase === "config" && (
        <section>
          <h2>1. 配置</h2>
          <p>uTradeHub 网址（固定）：</p>
          <input
            value={credentials.baseUrl}
            readOnly
            aria-label="uTradeHub 网址"
            style={{ width: "100%", background: "#f0f0f0" }}
          />

          <p>供应商映射 CSV 文件（列：vendor_name_en,supplier_name_ko,hs_code）：</p>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="供应商映射 CSV"
            onChange={(e) => void handleMappingFile(e.target.files)}
          />
          <p>{mappingFileName === "" ? "未选择映射文件" : `已加载映射：${mappingFileName}`}</p>

          <p>LLM API Key（仅本次会话，不保存）：</p>
          <input
            type="password"
            placeholder="API Key"
            aria-label="LLM API Key"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            style={{ width: "100%" }}
          />
          <p>
            <button type="button" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "▾ 高级（可选）" : "▸ 高级（可选）"}
            </button>
          </p>
          {showAdvanced && (
            <div>
              <input
                placeholder="模型（默认 deepseek-v4-flash）"
                aria-label="LLM 模型"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                style={{ width: "100%", marginBottom: 4 }}
              />
              <input
                placeholder="Base URL（默认 https://api.deepseek.com）"
                aria-label="LLM Base URL"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          )}

          <p>选择 PDF：</p>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <p>{pdfs.length} 个 PDF 已就绪</p>
          <button
            disabled={busy || pdfs.length === 0 || mappingCsv === "" || llmApiKey === ""}
            onClick={() => void handlePreview()}
          >
            干跑预览
          </button>
        </section>
      )}

      {phase === "preview" && (
        <section>
          <h2>2. 干跑预览（确认后才会驱动）</h2>
          {extractionFailures.length > 0 && (
            <div role="alert" style={{ color: "#b00", marginBottom: 8 }}>
              <p>以下文件解析失败，未纳入预览（请检查文件本身或 LLM 配置）：</p>
              <ul>
                {extractionFailures.map((f) => (
                  <li key={f.sourceFile}>
                    {f.sourceFile}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {groups.length === 0 && <p>没有可预览的分组——请查看上面的解析失败原因。</p>}
          {groups.map((g) => (
            <div
              key={g.groupKey}
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
                    checked={approved[g.groupKey] ?? false}
                    onChange={(e) => setApproved((a) => ({ ...a, [g.groupKey]: e.target.checked }))}
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
          ))}
          <h3>登录（仅本次会话，不保存）</h3>
          <input
            placeholder="账号"
            value={credentials.username}
            onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))}
          />{" "}
          <input
            placeholder="密码"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
          />
          <p>
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              我已核对预览，确认驱动建草稿（不会正式提交）
            </label>
          </p>
          <button
            disabled={
              busy || !confirmed || credentials.username === "" || credentials.password === ""
            }
            onClick={() => void handleRun()}
          >
            确认并运行
          </button>
        </section>
      )}

      {phase === "report" && report && (
        <section>
          <h2>3. 结果</h2>
          <p>
            成功 {report.succeeded} / 失败 {report.failed} / 共 {report.total}
          </p>
          <ul>
            {report.outcomes.map((o) => (
              <li key={o.groupKey} style={{ color: o.success ? "#070" : "#b00" }}>
                {o.groupKey}: {o.success ? "成功" : "失败"} — {o.message}
                {o.referenceNo !== null ? ` (#${o.referenceNo})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
