/**
 * GUIDERS-ADR-0052 import line parser (port of AuthoringImportLine).
 */

/** @typedef {"LogicalPath"|"WireLibrary"} AuthoringImportTargetKind */

/** @param {string} line */
export function stripComment(line) {
  const hash = line.indexOf("#");
  return hash >= 0 ? line.slice(0, hash) : line;
}

/**
 * @param {string} line
 * @returns {{ targetKind: AuthoringImportTargetKind, path: string, alias: string | null, legacy: boolean } | null}
 */
export function tryParseImportLine(line) {
  let text = stripComment(line).trim();
  if (!text) return null;

  let legacy = false;
  if (text.startsWith("!include ")) {
    legacy = true;
    text = text.slice("!include ".length).trim();
  } else if (text.startsWith("import ")) {
    text = text.slice("import ".length).trim();
  } else {
    return null;
  }

  if (!text) return null;

  let importPath;
  let alias = null;
  let targetKind;

  if (text[0] === '"' || text[0] === "'") {
    const quote = text[0];
    const end = text.indexOf(quote, 1);
    if (end < 0) return null;
    importPath = text.slice(1, end);
    if (!tryReadAlias(text.slice(end + 1).trim(), (a) => { alias = a; })) return null;
    targetKind = "LogicalPath";
  } else if (text[0] === "<") {
    const close = text.indexOf(">");
    if (close <= 1) return null;
    importPath = text.slice(1, close).trim();
    if (!importPath) return null;
    if (!tryReadAlias(text.slice(close + 1).trim(), (a) => { alias = a; })) return null;
    targetKind = "WireLibrary";
  } else {
    return null;
  }

  return { targetKind, path: importPath, alias, legacy };
}

/**
 * @param {string} source
 * @returns {{ imports: NonNullable<ReturnType<typeof tryParseImportLine>>[], bodyLines: string[] }}
 */
export function splitImports(source) {
  /** @type {NonNullable<ReturnType<typeof tryParseImportLine>>[]} */
  const imports = [];
  /** @type {string[]} */
  const bodyLines = [];
  for (const line of source.split(/\r?\n/)) {
    const parsed = tryParseImportLine(line);
    if (parsed) {
      imports.push(parsed);
      continue;
    }
    bodyLines.push(line);
  }
  return { imports, bodyLines };
}

/** @param {string} remainder @param {(alias: string) => void} setAlias */
function tryReadAlias(remainder, setAlias) {
  if (!remainder) return true;
  if (!remainder.toLowerCase().startsWith("as ")) return false;
  const alias = remainder.slice(3).trim();
  if (!alias) return false;
  setAlias(alias);
  return true;
}
