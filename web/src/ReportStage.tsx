import { type BatchReport } from "./api.js";

interface Props {
  report: BatchReport;
}

export function ReportStage({ report }: Props) {
  return (
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
  );
}
