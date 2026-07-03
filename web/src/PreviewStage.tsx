import { type Credentials, type ExtractionFailure, type GroupPreview } from "./api.js";
import { GroupCard } from "./GroupCard.js";

interface Props {
  groups: GroupPreview[];
  extractionFailures: ExtractionFailure[];
  approved: Record<string, boolean>;
  confirmed: boolean;
  credentials: Credentials;
  busy: boolean;
  onApprovedChange: (groupKey: string, checked: boolean) => void;
  onConfirmedChange: (checked: boolean) => void;
  onCredentialsChange: (patch: Partial<Credentials>) => void;
  onRun: () => void;
}

export function PreviewStage({
  groups,
  extractionFailures,
  approved,
  confirmed,
  credentials,
  busy,
  onApprovedChange,
  onConfirmedChange,
  onCredentialsChange,
  onRun,
}: Props) {
  const manualLogin = credentials.loginMode === "manual";
  const canRun =
    !busy &&
    confirmed &&
    (manualLogin || (credentials.username !== "" && credentials.password !== ""));

  return (
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
        <GroupCard
          key={g.groupKey}
          group={g}
          approved={approved[g.groupKey] ?? false}
          onApprovedChange={(checked) => onApprovedChange(g.groupKey, checked)}
        />
      ))}
      <h3>登录（仅本次会话，不保存）</h3>
      <p>
        <label>
          <input
            type="checkbox"
            checked={manualLogin}
            onChange={(e) =>
              onCredentialsChange({ loginMode: e.target.checked ? "manual" : "automatic" })
            }
          />{" "}
          在 Chrome 中手动登录
        </label>
      </p>
      <input
        placeholder="账号"
        value={credentials.username}
        disabled={manualLogin}
        onChange={(e) => onCredentialsChange({ username: e.target.value })}
      />{" "}
      <input
        placeholder="密码"
        type="password"
        value={credentials.password}
        disabled={manualLogin}
        onChange={(e) => onCredentialsChange({ password: e.target.value })}
      />
      <p>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => onConfirmedChange(e.target.checked)}
          />{" "}
          我已核对预览，确认驱动建草稿（不会正式提交）
        </label>
      </p>
      <button disabled={!canRun} onClick={onRun}>
        确认并运行
      </button>
    </section>
  );
}
