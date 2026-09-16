/**
 * Authoring project manifest loader (VISION-ADR-0006 / GUIDERS-0051).
 */

import fs from "node:fs";
import path from "node:path";
import {
  composeVisionFile,
  composeVisionFromMap,
  readVisionProjectMap,
} from "./vision-compose.js";

export function parseVisionProject(source) {
  const lines = source.split(/\r?\n/);
  let id = "";
  let root = ".";
  let entry = "";
  const documents = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const kw = parts[0];
    const rest = parts.slice(1).join(" ").trim();
    if (kw === "project") id = rest;
    else if (kw === "root") root = rest || ".";
    else if (kw === "entry") entry = rest.replace(/\\/g, "/");
    else if (kw === "document" && rest) documents.push(rest.replace(/\\/g, "/"));
  }
  if (!entry) throw new Error("V-P001: visionproj missing entry");
  return { id, root: root.replace(/\\/g, "/"), entry, documents };
}

export function resolveVisionProjectRoot(manifestPath, manifest) {
  const workspaceRoot = path.dirname(path.resolve(manifestPath));
  return path.resolve(workspaceRoot, manifest.root || ".");
}

function dirnamePosix(relPath) {
  const n = relPath.replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  return i >= 0 ? n.slice(0, i) : "";
}

export function normalizeVisionProjectUpload(manifestRel, manifest, uploadedVision) {
  const manifestDir = dirnamePosix(manifestRel.replace(/\\/g, "/"));
  const projectRootLogical = path.posix.normalize(
    path.posix.join(manifestDir, manifest.root || ".").replace(/^\.\//, ""),
  );
  const prefix = projectRootLogical ? `${projectRootLogical}/` : "";
  const files = {};
  for (const [key, content] of Object.entries(uploadedVision)) {
    const normalizedKey = key.replace(/\\/g, "/");
    let rel = normalizedKey;
    if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
    else if (projectRootLogical && rel.startsWith(`${projectRootLogical}/`)) {
      rel = rel.slice(projectRootLogical.length + 1);
    }
    files[rel] = content;
  }
  const entryRel = manifest.entry.replace(/\\/g, "/");
  return { projectRoot: projectRootLogical, entryRel, files };
}

export function selectVisionProjectManifest(manifestRels) {
  if (!manifestRels.length) return null;
  const sorted = [...manifestRels].sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });
  return sorted[0];
}

export async function composeVisionProject(projectFilePath, options = {}) {
  const abs = path.resolve(projectFilePath);
  const manifest = parseVisionProject(fs.readFileSync(abs, "utf8"));
  const projectRoot = resolveVisionProjectRoot(abs, manifest);
  const entryAbs = path.resolve(projectRoot, manifest.entry);
  if (!fs.existsSync(entryAbs)) {
    throw new Error(`V-P002: entry not found: ${manifest.entry}`);
  }
  return composeVisionFile(entryAbs, { ...options, projectRoot });
}

export async function composeVisionProjectFromUpload(
  manifestSource,
  manifestRel,
  uploadedVision,
  options = {},
) {
  const manifest = parseVisionProject(manifestSource);
  const { projectRoot, entryRel, files } = normalizeVisionProjectUpload(
    manifestRel,
    manifest,
    uploadedVision,
  );
  if (!(entryRel in files)) {
    throw new Error(`V-P002: entry not found: ${entryRel}`);
  }
  return composeVisionFromMap(entryRel, files, { ...options, projectRoot });
}

export function readVisionProjectFiles(projectRootDir) {
  return readVisionProjectMap(projectRootDir);
}
