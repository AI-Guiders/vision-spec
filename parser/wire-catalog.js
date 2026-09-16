/**
 * Federation wire library catalog for VisionSpec (VISION-ADR-0005 §2).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIRE_ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "stdlib", "wires");

/** @returns {string} */
export function wireCatalogRoot() {
  return WIRE_ROOT;
}

/**
 * @param {string} wirePath e.g. federation/vision/icon-defaults
 * @returns {string | null}
 */
export function resolveWireSource(wirePath) {
  const normalized = wirePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const file = path.join(WIRE_ROOT, `${normalized}.vision`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

/** @returns {string[]} */
export function listWireIds() {
  /** @type {string[]} */
  const ids = [];
  walk(WIRE_ROOT, "", ids);
  return ids.sort();
}

/** @param {string} dir @param {string} prefix @param {string[]} out */
function walk(dir, prefix, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(full).isDirectory()) walk(full, rel, out);
    else if (name.endsWith(".vision")) out.push(rel.slice(0, -".vision".length).replace(/\\/g, "/"));
  }
}
