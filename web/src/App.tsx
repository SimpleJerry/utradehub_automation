import { useState } from "react";
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
import { ConfigStage } from "./ConfigStage.js";
import { PreviewStage } from "./PreviewStage.js";
import { ReportStage } from "./ReportStage.js";

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
        <ConfigStage
          credentials={credentials}
          mappingFileName={mappingFileName}
          llmApiKey={llmApiKey}
          llmModel={llmModel}
          llmBaseUrl={llmBaseUrl}
          showAdvanced={showAdvanced}
          pdfs={pdfs}
          busy={busy}
          onMappingFile={(files) => void handleMappingFile(files)}
          onLlmApiKeyChange={setLlmApiKey}
          onLlmModelChange={setLlmModel}
          onLlmBaseUrlChange={setLlmBaseUrl}
          onToggleAdvanced={() => setShowAdvanced((v) => !v)}
          onPdfFiles={(files) => void handleFiles(files)}
          onPreview={() => void handlePreview()}
        />
      )}

      {phase === "preview" && (
        <PreviewStage
          groups={groups}
          extractionFailures={extractionFailures}
          approved={approved}
          confirmed={confirmed}
          credentials={credentials}
          busy={busy}
          onApprovedChange={(key, checked) => setApproved((a) => ({ ...a, [key]: checked }))}
          onConfirmedChange={setConfirmed}
          onCredentialsChange={(patch) => setCredentials((c) => ({ ...c, ...patch }))}
          onRun={() => void handleRun()}
        />
      )}

      {phase === "report" && report && <ReportStage report={report} />}
    </main>
  );
}
