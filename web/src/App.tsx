import { useState } from "react";
import {
  fetchEnvironment,
  preview,
  run,
  type BatchReport,
  type Credentials,
  type EnvIssue,
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

export function App() {
  const [phase, setPhase] = useState<Phase>("config");
  const [mappingCsv, setMappingCsv] = useState("");
  const [pdfs, setPdfs] = useState<PdfUpload[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [groups, setGroups] = useState<GroupPreview[]>([]);
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

  async function handlePreview() {
    setBusy(true);
    setError("");
    try {
      const result = await preview(mappingCsv, pdfs);
      setSessionId(result.sessionId);
      setGroups(result.groups);
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
          <p>供应商映射 CSV（vendor_name_en,supplier_name_ko,hs_code）：</p>
          <textarea
            value={mappingCsv}
            onChange={(e) => setMappingCsv(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
          <p>选择 PDF：</p>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <p>{pdfs.length} 个 PDF 已就绪</p>
          <button disabled={busy || pdfs.length === 0} onClick={() => void handlePreview()}>
            干跑预览
          </button>
        </section>
      )}

      {phase === "preview" && (
        <section>
          <h2>2. 干跑预览（确认后才会驱动）</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>批准</th>
                <th>供应商</th>
                <th>HS</th>
                <th>行项目</th>
                <th>校验</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.groupKey}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={!g.isValid}
                      checked={approved[g.groupKey] ?? false}
                      onChange={(e) =>
                        setApproved((a) => ({ ...a, [g.groupKey]: e.target.checked }))
                      }
                    />
                  </td>
                  <td>{g.supplierNameKo ?? g.payToVendorNameEn ?? g.groupKey}</td>
                  <td>{g.hsCode ?? "-"}</td>
                  <td>{g.lineItems.length}</td>
                  <td style={{ color: g.isValid ? "#070" : "#b00" }}>
                    {g.isValid ? "OK" : `缺: ${g.missingFields.join(",")}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
