// Assemble the Windows app bundle for UTradeHub Automation.
// Produces packaging/build/ containing: node.exe, a launcher, and app/ (esbuild-bundled
// backend + production node_modules + web/dist). Then (unless --no-installer) runs Inno
// Setup to produce packaging/dist/Setup.exe.
//
// Strategy: esbuild bundles ONLY our own src (--packages=external); every node_modules
// dependency (playwright-core, fastify, unpdf, ...) ships intact, so dynamic-require deps
// need no special handling. node.exe is the current machine's runtime (version-matched).

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version: appVersion } = JSON.parse(
  readFileSync(join(repo, "package.json"), "utf8"),
);
const buildDir = join(repo, "packaging", "build");
const appDir = join(buildDir, "app");
const stageDir = join(buildDir, ".stage");
const run = (cmd, args, cwd = repo) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

console.log("[package] clean", buildDir);
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });

console.log("[package] build frontend");
run("npm", ["run", "build"]);

console.log("[package] esbuild backend (src only, deps external)");
await build({
  entryPoints: [join(repo, "src/app/server/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  packages: "external",
  outfile: join(appDir, "index.mjs"),
});

console.log("[package] stage production node_modules");
mkdirSync(stageDir, { recursive: true });
copyFileSync(join(repo, "package.json"), join(stageDir, "package.json"));
copyFileSync(join(repo, "package-lock.json"), join(stageDir, "package-lock.json"));
run("npm", ["ci", "--omit=dev", "--ignore-scripts"], stageDir);
cpSync(join(stageDir, "node_modules"), join(appDir, "node_modules"), { recursive: true });
rmSync(stageDir, { recursive: true, force: true });

console.log("[package] copy web/dist");
cpSync(join(repo, "web", "dist"), join(appDir, "web", "dist"), { recursive: true });

console.log("[package] copy node.exe", process.execPath);
copyFileSync(process.execPath, join(buildDir, "node.exe"));

console.log("[package] write launcher");
writeFileSync(
  join(buildDir, "UTradeHubAutomation.cmd"),
  [
    "@echo off",
    'set "WEB_DIST_DIR=%~dp0app\\web\\dist"',
    '"%~dp0node.exe" "%~dp0app\\index.mjs"',
    "",
  ].join("\r\n"),
);

console.log("[package] bundle assembled at", buildDir);

if (!process.argv.includes("--no-installer")) {
  console.log("[package] run Inno Setup");
  const iscc =
    process.env.ISCC ?? "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe";
  if (!existsSync(iscc)) {
    console.error(`[package] Inno Setup not found at ${iscc}; set ISCC env or pass --no-installer`);
    process.exit(1);
  }
  // No shell here: ISCC.exe lives under a path with spaces, and shell:true would only
  // concatenate (not quote) the args, breaking the path. execFileSync handles it directly.
  // /DMyAppVersion=x.y.z injects the version from package.json into the installer script.
  execFileSync(iscc, [
    `/DMyAppVersion=${appVersion}`,
    join(repo, "packaging", "installer.iss"),
  ], {
    cwd: join(repo, "packaging"),
    stdio: "inherit",
  });
  console.log("[package] installer at packaging/dist/");
}
