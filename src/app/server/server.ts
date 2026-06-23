import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import type { SupplierGroup } from "../../core/model.js";
import { previewBatch, submitBatch, type PdfInput, type PreviewPorts } from "../orchestrator.js";
import type { ServerDeps } from "./deps.js";

interface PreviewBody {
  mappingCsv: string;
  pdfs: { sourceFile: string; base64: string }[];
}

interface RunBody {
  sessionId: string;
  approvedGroupKeys: string[];
  credentials: { baseUrl: string; username: string; password: string };
}

/** Build the local HTTP API. Dependencies are injected so tests use fakes (no browser/network). */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 });
  // Per-session grouped result, retained in memory only between preview and run.
  const sessions = new Map<string, SupplierGroup[]>();

  app.get("/api/environment", async () => {
    return { issues: await deps.detectEnvironment() };
  });

  app.post("/api/preview", async (request) => {
    const body = request.body as PreviewBody;
    const mapping = deps.parseMapping(body.mappingCsv);
    if (!mapping.ok) return { error: mapping.error };

    const inputs: PdfInput[] = body.pdfs.map((p) => ({
      sourceFile: p.sourceFile,
      pdf: Buffer.from(p.base64, "base64"),
    }));
    const ports: PreviewPorts = { extractor: deps.extractor, mapping: mapping.value };

    const outcome = await previewBatch(inputs, ports);
    const sessionId = randomUUID();
    sessions.set(sessionId, outcome.groups);
    return { sessionId, ...outcome.result };
  });

  app.post("/api/run", async (request) => {
    const body = request.body as RunBody;
    const groups = sessions.get(body.sessionId);
    if (!groups) return { error: "session_not_found" };

    const approved = groups.filter((g) => body.approvedGroupKeys.includes(g.groupKey));
    return submitBatch(approved, body.credentials, deps.driver);
  });

  return app;
}
