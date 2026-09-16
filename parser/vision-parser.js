/**
 * VisionSpec parser — component model (VISION-ADR-0004).
 */

import { resolveOnTarget } from "./vision-graph.js";
import { resolvePlugins } from "./plugins.js";
import {
  readTopLevelBlock,
  wrapCatalogDocument,
  wrapDeckDocument,
} from "./gdl-router.js";
import { invokeGdlBridgeAsync } from "./gdl-bridge-core.js";
import { parsePipeTable, rowToRecord } from "./vision-tables.js";
import { parseIconRef } from "./icon-ref.js";
import { parseFixtureBody } from "./fixture-parse.js";
import { isComponentKind } from "./component-kinds.js";
import { validateDocument } from "./vision-validate.js";
import { splitImports } from "./authoring-import.js";

/** @typedef {{ kind: "folder", name: string, children: TreeFixtureNode[] } | { kind: "file", path: string, artifactKind: string }} TreeFixtureNode */

/** @param {"catalog"|"deck"} kind @param {string} wrapped @param {string | undefined} gdlEndpoint */
async function parseGdlBlock(kind, wrapped, gdlEndpoint) {
  if (gdlEndpoint) return invokeGdlBridgeAsync(kind, wrapped, gdlEndpoint);
  const bridge = await import("./gdl-bridge.js");
  return kind === "catalog"
    ? bridge.parseCatalogViaBridge(wrapped)
    : bridge.parseDeckViaBridge(wrapped);
}

const KEYWORD_LINE =
  /^(vision|screen|fixture|go|on|end|use|catalog|deck|component|components|presentation|icon-libraries|defaults)\b/i;
const USE_LINE = /^use\s+(\S+)\s*$/i;
const TITLE_LINE = /^title\s+"([^"]*)"/i;
const LAYOUT_ROW = /^row\s+\[(.+)\]\s*$/i;
const LAYOUT_COL = /^col\s+\[(.+)\]\s*$/i;
const COMPONENT_LINE = /^component\s+(\S+)\s+(\S+)\s*$/i;
const GO_LINE = /^go\s+(\S+)\s+->\s+(\S+)\s+when\s+(.+)$/i;
const ON_LINE = /^on\s+(\S+)\s+(\S+)\s+(\S+)\s+->\s+(\S+)\s*$/i;
const THEN_LINE = /^\s*then\s+(.+)$/i;
const ICON_LIBRARY_LINE = /^(\S+)\s+source\s+(\S+)\s*$/i;
const DEFAULT_KV = /^([\w.-]+)\s*=\s*(.+)\s*$/;
const LABEL_LINE = /^label\s+"([^"]*)"\s*$/i;

/** @param {string[]} body @param {string} defaultLibrary */
function parsePresentationBody(body, defaultLibrary) {
  /** @type {{ label: string | null, kinds: { kind: string, icon: ReturnType<typeof parseIconRef>, colorToken: string }[] }} */
  const pres = { label: null, kinds: [] };
  const lines = body.map((l) => l.trimEnd());
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const labelMatch = trimmed.match(LABEL_LINE);
    if (labelMatch) {
      pres.label = labelMatch[1];
      continue;
    }
    if (/^table\s+kind\s*$/i.test(trimmed)) {
      const table = parsePipeTable(lines, i + 1);
      pres.kinds = table.rows.map((row) => {
        const rec = rowToRecord(table.headers, row);
        return {
          kind: rec.kind,
          icon: parseIconRef(rec.icon, defaultLibrary),
          colorToken: rec["color-token"] ?? rec.colorToken ?? "",
        };
      });
      i = table.next - 1;
    }
  }
  return pres;
}

/**
 * @param {string} source
 * @param {{ gdlEndpoint?: string, strict?: boolean, projectRoot?: string, readFile?: (logicalPath: string) => string, compose?: boolean }} [options]
 */
export async function parseVision(source, options = {}) {
  if (options.compose === false) {
    return parseVisionLeaf(source, options);
  }
  const { imports } = splitImports(source);
  if (imports.length || options.projectRoot) {
    if (!options.projectRoot && imports.length) {
      throw new Error("V-I006: import requires projectRoot (use composeVisionFile)");
    }
    const { composeVision } = await import("./vision-compose.js");
    return composeVision(source, options);
  }
  return parseVisionLeaf(source, options);
}

export { composeVisionFile } from "./vision-compose.js";

/**
 * @param {string} source
 * @param {{ gdlEndpoint?: string, strict?: boolean }} [options]
 */
export async function parseVisionLeaf(source, options = {}) {
  return parseVisionCore(source, options, { mode: "leaf" });
}

/**
 * @param {string} source
 * @param {{ gdlEndpoint?: string, strict?: boolean }} [options]
 */
export async function parseVisionFragment(source, options = {}) {
  return parseVisionCore(source, options, { mode: "pack" });
}

/**
 * @param {string} source
 * @param {{ gdlEndpoint?: string, strict?: boolean }} [options]
 * @param {{ mode: "leaf" | "pack" }} ctx
 */
async function parseVisionCore(source, options = {}, ctx) {
  const gdlEndpoint = options.gdlEndpoint;
  const { bodyLines } = splitImports(source);
  const lines = bodyLines.join("\n").split(/\r?\n/);
  /** @type {VisionDocument} */
  const doc = {
    id: "",
    title: "",
    plugins: [],
    defaults: { iconLibrary: "codicons" },
    iconLibraries: [{ id: "codicons", source: "npm:@vscode/codicons" }],
    componentRegistry: null,
    presentations: {},
    screens: [],
    fixtures: {},
    catalog: null,
    deck: null,
    transitions: [],
    handlers: [],
    diagnostics: [],
  };

  let screen = null;
  /** @type {string | null} */
  let fixtureName = null;
  /** @type {string[]} */
  let fixtureBody = [];
  let pendingGo = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const titleMatch = trimmed.match(TITLE_LINE);
    if (titleMatch && !screen && !fixtureName) {
      doc.title = titleMatch[1];
      continue;
    }

    const thenMatch = trimmed.match(THEN_LINE);
    if (thenMatch) {
      const note = thenMatch[1].trim();
      if (pendingGo) pendingGo.then = note;
      else if (doc.handlers.length) doc.handlers[doc.handlers.length - 1].then = note;
      continue;
    }

    if (/^end\s+fixture\s*$/i.test(trimmed) && fixtureName) {
      doc.fixtures[fixtureName] = parseFixtureBody(fixtureBody);
      fixtureName = null;
      fixtureBody = [];
      continue;
    }

    if (/^end\s+presentation\s*$/i.test(trimmed)) {
      continue;
    }

    if (fixtureName) {
      fixtureBody.push(raw);
      continue;
    }

    if (/^vision\s+/i.test(trimmed)) {
      doc.id = trimmed.split(/\s+/)[1];
      continue;
    }

    if (/^defaults\s*$/i.test(trimmed) && !screen && !fixtureName) {
      const block = readVisionDefaults(lines, i);
      applyVisionDefaults(doc, block.body);
      i = block.next - 1;
      continue;
    }

    if (/^icon-libraries\s*$/i.test(trimmed) && !screen) {
      const block = readTopLevelBlock(lines, i, "icon-libraries");
      doc.iconLibraries = block.body
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const m = line.match(ICON_LIBRARY_LINE);
          if (!m) throw new Error(`Invalid icon library line: ${line}`);
          return { id: m[1], source: m[2] };
        });
      i = block.next - 1;
      continue;
    }

    if (/^components\s+/i.test(trimmed) && !screen) {
      const planetId = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "components");
      doc.componentRegistry = parseComponentRegistry(planetId, block.body, doc.defaults.iconLibrary);
      i = block.next - 1;
      continue;
    }

    if (/^presentation\s+/i.test(trimmed) && !screen) {
      const presentationId = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "presentation");
      doc.presentations[presentationId] = parsePresentationBody(
        block.body,
        doc.defaults.iconLibrary,
      );
      i = block.next - 1;
      continue;
    }

    if (/^catalog\s+/i.test(trimmed) && !screen) {
      const id = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "catalog");
      const wrapped = wrapCatalogDocument(id, block.body);
      doc.catalog = await parseGdlBlock("catalog", wrapped, gdlEndpoint);
      i = block.next - 1;
      continue;
    }

    if (/^deck\s+/i.test(trimmed) && !screen) {
      const id = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "deck");
      const wrapped = wrapDeckDocument(id, block.body);
      doc.deck = await parseGdlBlock("deck", wrapped, gdlEndpoint);
      i = block.next - 1;
      continue;
    }

    const useMatch = trimmed.match(USE_LINE);
    if (useMatch) {
      if (!doc.plugins.includes(useMatch[1])) doc.plugins.push(useMatch[1]);
      continue;
    }

    if (/^screen\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+/);
      screen = {
        id: parts[1],
        overlay: parts.includes("overlay"),
        components: [],
        layout: [],
        deck: null,
      };
      doc.screens.push(screen);
      pendingGo = null;
      continue;
    }

    if (/^fixture\s+/i.test(trimmed)) {
      fixtureName = trimmed.split(/\s+/)[1];
      fixtureBody = [];
      pendingGo = null;
      continue;
    }

    if (/^go\s+/i.test(trimmed)) {
      const m = trimmed.match(GO_LINE);
      if (!m) throw new Error(`Line ${i + 1}: invalid go: ${trimmed}`);
      pendingGo = {
        from: m[1],
        to: m[2],
        when: m[3].trim(),
        then: null,
      };
      doc.transitions.push(pendingGo);
      continue;
    }

    if (/^on\s+/i.test(trimmed)) {
      const m = trimmed.match(ON_LINE);
      if (!m) throw new Error(`Line ${i + 1}: invalid on: ${trimmed}`);
      doc.handlers.push({
        component: m[1],
        event: m[2],
        target: m[3],
        to: m[4],
        then: null,
      });
      pendingGo = null;
      continue;
    }

    if (/^end\s*$/i.test(trimmed)) break;

    if (screen) {
      const plugins = resolvePlugins(doc);
      let handled = false;
      for (const plugin of plugins) {
        if (plugin.parseScreenLine?.({ screen, doc, lineNo: i + 1 }, trimmed)) {
          handled = true;
          break;
        }
      }
      if (handled) continue;
    }

    if (!screen) {
      if (KEYWORD_LINE.test(trimmed)) throw new Error(`Line ${i + 1}: unexpected top-level: ${trimmed}`);
      continue;
    }

    let layout = null;
    let m;
    if ((layout = matchLayout(LAYOUT_ROW, trimmed, "row"))) screen.layout.push(layout);
    else if ((layout = matchLayout(LAYOUT_COL, trimmed, "col"))) screen.layout.push(layout);
    else if ((m = trimmed.match(COMPONENT_LINE))) {
      const kind = m[2];
      if (!isComponentKind(kind)) throw new Error(`Line ${i + 1}: unknown component kind "${kind}"`);
      screen.components.push({ id: m[1], kind });
    } else if (KEYWORD_LINE.test(trimmed)) throw new Error(`Line ${i + 1}: unexpected: ${trimmed}`);
  }

  if (ctx.mode === "leaf") {
    if (!doc.id) throw new Error("Missing vision id");
    if (!doc.screens.length) throw new Error("No screens");
  }

  for (const h of doc.handlers) {
    const { toScreen, toComponent } = resolveOnTarget(doc, h.component, h.to);
    h.toScreen = toScreen;
    h.toComponent = toComponent;
  }

  if (ctx.mode === "leaf") {
    validateDocument(doc, { strict: options.strict !== false });
  }
  return doc;
}

/** @param {string[]} allLines @param {number} start */
function readVisionDefaults(allLines, start) {
  const body = [];
  let i = start + 1;
  while (i < allLines.length) {
    const t = allLines[i].trim();
    if (/^end\s+defaults\s*$/i.test(t)) return { body, next: i + 1 };
    body.push(allLines[i]);
    i += 1;
  }
  throw new Error("Missing end defaults");
}

/** @param {VisionDocument} doc @param {string[]} bodyLines */
function applyVisionDefaults(doc, bodyLines) {
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(DEFAULT_KV);
    if (!m) continue;
    if (m[1] === "icon.library") doc.defaults.iconLibrary = m[2].trim();
  }
}

/** @param {string} planetId @param {string[]} body @param {string} defaultLibrary */
function parseComponentRegistry(planetId, body, defaultLibrary) {
  const lines = body.map((l) => l.trimEnd());
  const tableIdx = lines.findIndex((l) => l.trim().startsWith("|"));
  if (tableIdx < 0) throw new Error("components section requires table");
  const table = parsePipeTable(lines, tableIdx);
  const rows = table.rows.map((row) => {
    const rec = rowToRecord(table.headers, row);
    return {
      id: rec.id ?? rec.zone ?? "",
      kind: rec.kind ?? "",
      label: rec.label ?? "",
    };
  });
  return { planetId, rows };
}

function matchLayout(re, text, kind) {
  const m = text.match(re);
  if (!m) return null;
  const slots = m[1].split("|").map((s) => s.trim()).filter(Boolean);
  return { kind, slots };
}

export function entryScreen(doc) {
  return doc.screens.find((s) => !s.overlay) ?? doc.screens[0];
}

/** @typedef {Awaited<ReturnType<parseVision>>} VisionDocument */
