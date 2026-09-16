/**
 * Resolve federation imports and compose VisionDocument (VISION-ADR-0005).
 */

import fs from "node:fs";
import path from "node:path";
import { splitImports } from "./authoring-import.js";
import { emptyVisionDocument, mergeVisionDocuments } from "./vision-merge.js";
import { parseVisionFragment, parseVisionLeaf } from "./vision-parser.js";
import { resolveOnTarget } from "./vision-graph.js";
import { validateDocument } from "./vision-validate.js";
import { resolveWireSource, wireCatalogRoot } from "./wire-catalog.js";

/**
 * @param {string} pattern
 */
function globToRegex(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  return new RegExp(
    "^" +
      normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, ".") +
      "$",
  );
}

/**
 * @param {string} projectRoot
 * @param {string} logicalPattern
 * @param {Record<string, string>} [files]
 * @returns {string[]}
 */
export function expandLogicalPattern(projectRoot, logicalPattern, files) {
  const normalized = logicalPattern.replace(/\\/g, "/");
  if (!normalized.includes("*") && !normalized.includes("?")) return [normalized];

  if (files) {
    const rx = globToRegex(normalized);
    return Object.keys(files)
      .map((k) => k.replace(/\\/g, "/"))
      .filter((k) => rx.test(k))
      .sort();
  }

  const slash = normalized.lastIndexOf("/");
  const dir = slash >= 0 ? normalized.slice(0, slash) : "";
  const filePattern = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dirFull = dir ? path.join(projectRoot, dir) : projectRoot;
  if (!fs.existsSync(dirFull)) return [];

  const rx = globToRegex(filePattern);
  return fs
    .readdirSync(dirFull)
    .filter((name) => rx.test(name))
    .map((name) => (dir ? `${dir}/${name}` : name).replace(/\\/g, "/"))
    .sort();
}

/**
 * @param {string} source
 * @param {{
 *   projectRoot?: string,
 *   readFile?: (logicalPath: string) => string,
 *   files?: Record<string, string>,
 *   resolveWire?: (wirePath: string) => string | null,
 *   gdlEndpoint?: string,
 *   strict?: boolean,
 *   _stack?: string[],
 * }} options
 */
export async function composeVision(source, options) {
  const projectRoot = options.projectRoot ?? "";
  const files = options.files;
  const readFile = options.readFile ?? ((rel) => fs.readFileSync(path.join(projectRoot, rel), "utf8"));
  const stack = options._stack ?? [];
  /** @type {{ code: string, message: string, severity: "warning"|"error" }[]} */
  const composeDiagnostics = [];

  const { imports, bodyLines } = splitImports(source);
  let merged = emptyVisionDocument();

  for (const imp of imports) {
    if (imp.legacy) {
      composeDiagnostics.push({
        code: "V-I007",
        message: "!include is deprecated; use import",
        severity: "warning",
      });
    }

    if (imp.targetKind === "WireLibrary") {
      const stackKey = `<${imp.path}>`;
      if (stack.includes(stackKey)) {
        composeDiagnostics.push({
          code: "V-I005",
          message: `Import cycle at <${imp.path}>`,
          severity: "error",
        });
        continue;
      }
      const wireSource = options.resolveWire?.(imp.path) ?? resolveWireSource(imp.path);
      if (!wireSource) {
        composeDiagnostics.push({
          code: "V-I006",
          message: `Unresolved wire import <${imp.path}>`,
          severity: "error",
        });
        continue;
      }
      const child = await composeVision(wireSource, {
        ...options,
        projectRoot: wireCatalogRoot(),
        files: undefined,
        readFile: (rel) => fs.readFileSync(path.join(wireCatalogRoot(), rel), "utf8"),
        _stack: [...stack, stackKey],
      });
      mergeVisionDocuments(merged, child, { diagnostics: composeDiagnostics });
      continue;
    }

    const paths = expandLogicalPattern(projectRoot, imp.path, files);
    if (!paths.length) {
      composeDiagnostics.push({
        code: "V-I006",
        message: `Unresolved logical import "${imp.path}"`,
        severity: "error",
      });
      continue;
    }

    for (const logicalPath of paths) {
      const stackKey = logicalPath.replace(/\\/g, "/");
      if (stack.includes(stackKey)) {
        composeDiagnostics.push({
          code: "V-I005",
          message: `Import cycle at "${logicalPath}"`,
          severity: "error",
        });
        continue;
      }

      let childSource;
      try {
        childSource = readFile(logicalPath);
      } catch {
        composeDiagnostics.push({
          code: "V-I006",
          message: `Unresolved logical import "${logicalPath}"`,
          severity: "error",
        });
        continue;
      }

      const child = await composeVision(childSource, {
        ...options,
        _stack: [...stack, stackKey],
      });
      mergeVisionDocuments(merged, child, { diagnostics: composeDiagnostics });
    }
  }

  const body = bodyLines.join("\n");
  const hasLeafScenario = /\bvision\s+/i.test(body) && /\bscreen\s+/i.test(body);

  if (hasLeafScenario) {
    const leaf = await parseVisionLeaf(body, options);
    mergeVisionDocuments(merged, leaf, { diagnostics: composeDiagnostics, leafWins: true });
    merged.id = leaf.id;
    merged.screens = leaf.screens;
    merged.transitions = leaf.transitions;
    merged.handlers = leaf.handlers;
    if (leaf.catalog) merged.catalog = leaf.catalog;
    if (leaf.deck) merged.deck = leaf.deck;
    if (leaf.title) merged.title = leaf.title;
    for (const h of merged.handlers) {
      const { toScreen, toComponent } = resolveOnTarget(merged, h.component, h.to);
      h.toScreen = toScreen;
      h.toComponent = toComponent;
    }
  } else {
    const pack = await parseVisionFragment(body, options);
    mergeVisionDocuments(merged, pack, { diagnostics: composeDiagnostics });
  }

  validateDocument(merged, { strict: false });
  merged.diagnostics = [...composeDiagnostics, ...merged.diagnostics];

  const fatal = merged.diagnostics.filter((d) => d.severity === "error");
  if (options.strict !== false && fatal.length) {
    throw new Error(fatal.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }

  return merged;
}

/**
 * @param {string} entryRel
 * @param {Record<string, string>} files
 * @param {{ gdlEndpoint?: string, strict?: boolean, projectRoot?: string }} [options]
 */
export async function composeVisionFromMap(entryRel, files, options = {}) {
  const entry = entryRel.replace(/\\/g, "/");
  const source = files[entry];
  if (source == null) throw new Error(`V-I006: missing entry file "${entry}"`);
  return composeVision(source, {
    ...options,
    projectRoot: options.projectRoot ?? "",
    files,
    readFile: (rel) => {
      const key = rel.replace(/\\/g, "/");
      if (!(key in files)) throw new Error(`ENOENT:${key}`);
      return files[key];
    },
  });
}

/**
 * @param {string} projectRootDir
 * @returns {Record<string, string>}
 */
export function readVisionProjectMap(projectRootDir) {
  const root = path.resolve(projectRootDir);
  /** @type {Record<string, string>} */
  const files = {};
  walkVisionFiles(root, root, files);
  return files;
}

/** @param {string} dir @param {string} root @param {Record<string, string>} out */
function walkVisionFiles(dir, root, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkVisionFiles(full, root, out);
    else if (name.endsWith(".vision")) {
      out[path.relative(root, full).replace(/\\/g, "/")] = fs.readFileSync(full, "utf8");
    }
  }
}

/**
 * @param {Record<string, string>} files
 * @returns {string | null}
 */
export function detectLeafEntry(files) {
  const keys = Object.keys(files).sort();
  for (const key of keys) {
    const body = files[key];
    if (/\bvision\s+/i.test(body) && /\bscreen\s+/i.test(body)) return key;
  }
  return keys[0] ?? null;
}

/**
 * @param {string} filePath
 * @param {{ gdlEndpoint?: string, strict?: boolean }} [options]
 */
export async function composeVisionFile(filePath, options = {}) {
  const projectRoot = path.dirname(path.resolve(filePath));
  const source = fs.readFileSync(filePath, "utf8");
  return composeVision(source, { ...options, projectRoot });
}
