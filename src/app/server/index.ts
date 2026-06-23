import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { buildServer } from "./server.js";
import { createProductionDeps } from "./deps.js";

const port = Number(process.env.PORT ?? 3000);

function openBrowser(url: string): void {
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" })
      : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
}

async function main(): Promise<void> {
  const app = buildServer(createProductionDeps());
  const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../../web/dist");
  await app.register(fastifyStatic, { root: webDist });
  await app.listen({ port, host: "127.0.0.1" });
  const url = `http://127.0.0.1:${port}`;
  openBrowser(url);
  console.log(`UTradeHub Automation: ${url}`);
}

void main();
