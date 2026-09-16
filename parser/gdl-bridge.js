/**
 * Node GDL bridge — federation parsers via tools/VisionGdlBridge (F#).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertClean, invokeGdlBridgeAsync as invokeGdlBridgeAsyncCore } from "./gdl-bridge-core.js";

export { assertClean } from "./gdl-bridge-core.js";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BRIDGE_PROJECT = path.join(ROOT, "tools", "VisionGdlBridge", "VisionGdlBridge.fsproj");

/** @param {string} kind @param {string} gdlText */
export function invokeGdlBridgeSync(kind, gdlText) {
  const result = spawnSync(
    "dotnet",
    ["run", "--project", BRIDGE_PROJECT, "--no-build", "--", kind],
    { input: gdlText, encoding: "utf8", cwd: ROOT },
  );
  const stdout = result.stdout?.trim() ?? "";
  if (!stdout) {
    throw new Error(
      `VisionGdlBridge ${kind} produced no output: ${result.stderr?.trim() || "unknown error"}`,
    );
  }
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(`VisionGdlBridge ${kind} invalid JSON: ${stdout.slice(0, 200)}`);
  }
  if (result.status !== 0) assertClean(payload, kind);
  return assertClean(payload, kind);
}

/** @param {string} kind @param {string} gdlText @param {string | undefined} endpoint */
export async function invokeGdlBridgeAsync(kind, gdlText, endpoint) {
  if (!endpoint) return invokeGdlBridgeSync(kind, gdlText);
  return invokeGdlBridgeAsyncCore(kind, gdlText, endpoint);
}

/** @param {string} gdlText */
export function parseCatalogViaBridge(gdlText) {
  return invokeGdlBridgeSync("catalog", gdlText);
}

/** @param {string} gdlText */
export function parseDeckViaBridge(gdlText) {
  return invokeGdlBridgeSync("deck", gdlText);
}
