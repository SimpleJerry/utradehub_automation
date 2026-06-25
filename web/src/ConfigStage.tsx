import { type CSSProperties } from "react";
import { type PdfUpload } from "./api.js";

interface Props {
  credentials: { baseUrl: string };
  mappingFileName: string;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  showAdvanced: boolean;
  pdfs: PdfUpload[];
  busy: boolean;
  onMappingFile: (files: FileList | null) => void;
  onLlmApiKeyChange: (value: string) => void;
  onLlmModelChange: (value: string) => void;
  onLlmBaseUrlChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onPdfFiles: (files: FileList | null) => void;
  onPreview: () => void;
}

const inputFull: CSSProperties = { width: "100%" };
const inputFullMb: CSSProperties = { width: "100%", marginBottom: 4 };

export function ConfigStage({
  credentials,
  mappingFileName,
  llmApiKey,
  llmModel,
  llmBaseUrl,
  showAdvanced,
  pdfs,
  busy,
  onMappingFile,
  onLlmApiKeyChange,
  onLlmModelChange,
  onLlmBaseUrlChange,
  onToggleAdvanced,
  onPdfFiles,
  onPreview,
}: Props) {
  const canPreview = !busy && pdfs.length > 0 && mappingFileName !== "" && llmApiKey !== "";

  return (
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
        onChange={(e) => onMappingFile(e.target.files)}
      />
      <p>{mappingFileName === "" ? "未选择映射文件" : `已加载映射：${mappingFileName}`}</p>

      <p>LLM API Key（仅本次会话，不保存）：</p>
      <input
        type="password"
        placeholder="API Key"
        aria-label="LLM API Key"
        value={llmApiKey}
        onChange={(e) => onLlmApiKeyChange(e.target.value)}
        style={inputFull}
      />
      <p>
        <button type="button" onClick={onToggleAdvanced}>
          {showAdvanced ? "▾ 高级（可选）" : "▸ 高级（可选）"}
        </button>
      </p>
      {showAdvanced && (
        <div>
          <input
            placeholder="模型（默认 deepseek-v4-flash）"
            aria-label="LLM 模型"
            value={llmModel}
            onChange={(e) => onLlmModelChange(e.target.value)}
            style={inputFullMb}
          />
          <input
            placeholder="Base URL（默认 https://api.deepseek.com）"
            aria-label="LLM Base URL"
            value={llmBaseUrl}
            onChange={(e) => onLlmBaseUrlChange(e.target.value)}
            style={inputFull}
          />
        </div>
      )}

      <p>选择 PDF：</p>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => onPdfFiles(e.target.files)}
      />
      <p>{pdfs.length} 个 PDF 已就绪</p>
      <button disabled={!canPreview} onClick={onPreview}>
        干跑预览
      </button>
    </section>
  );
}
