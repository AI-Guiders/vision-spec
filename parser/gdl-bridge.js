/**
 * Routes GDL text to federation parsers via tools/VisionGdlBridge (F# CatalogParser / DeckParser).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BRIDGE_PROJECT = path.join(ROOT, "tools", "VisionGdlBridge", "VisionGdlBridge.fsproj");

/** @param {unknown} payload @param {string} kind */
function assertClean(payload, kind) {
  const diagnostics = payload?.diagnostics;
  if (Array.isArray(diagnostics) && diagnostics.length) {
    const msg = diagnostics.map((d) => `${d.line}: ${d.message}`).join("; ");
    throw new Error(`VisionGdlBridge ${kind}: ${msg}`);
  }
  return payload;
}

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
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, text: gdlText }),
  });
  if (!res.ok) throw new Error(`VisionGdlBridge HTTP ${res.status}: ${await res.text()}`);
  return assertClean(await res.json(), kind);
}

/** @param {string} gdlText */
export function parseCatalogViaBridge(gdlText) {
  return invokeGdlBridgeSync("catalog", gdlText);
}

/** @param {string} gdlText */
export function parseDeckViaBridge(gdlText) {
  return invokeGdlBridgeSync("deck", gdlText);
}
