/**
 * VisionSpec v0 parser — line-oriented, returns JSON-serializable IR.
 */

import { resolveOnTarget } from "./vision-graph.js";
import { resolvePlugins } from "./plugins.js";
import {
  readTopLevelBlock,
  wrapCatalogDocument,
  wrapDeckDocument,
} from "./gdl-router.js";
import { invokeGdlBridgeAsync } from "./gdl-bridge-core.js";

/** @param {"catalog"|"deck"} kind @param {string} wrapped @param {string | undefined} gdlEndpoint */
async function parseGdlBlock(kind, wrapped, gdlEndpoint) {
  if (gdlEndpoint) return invokeGdlBridgeAsync(kind, wrapped, gdlEndpoint);
  const bridge = await import("./gdl-bridge.js");
  return kind === "catalog"
    ? bridge.parseCatalogViaBridge(wrapped)
    : bridge.parseDeckViaBridge(wrapped);
}

const KEYWORD_LINE = /^(vision|screen|fixture|go|on|end|use|catalog|deck)\b/i;
const USE_LINE = /^use\s+(\S+)\s*$/i;
const TITLE_LINE = /^title\s+"([^"]*)"/i;
const LAYOUT_ROW = /^row\s+\[(.+)\]\s*$/i;
const LAYOUT_COL = /^col\s+\[(.+)\]\s*$/i;
const PANEL_LINE = /^panel\s+(\S+)/i;
const TREE_LINE = /^tree\s+(\S+)/i;
const TABS_LINE = /^tabs\s+(\S+)/i;
const PREVIEW_LINE = /^preview\s+(\S+)/i;
const REPL_LINE = /^repl\s+(\S+)/i;
const PAD_LINE = /^pad\s+(\S+)/i;
const SEARCH_LINE = /^search\s*$/i;
const COMMAND_LIST_LINE = /^command-list\s*$/i;
const GO_LINE = /^go\s+(\S+)\s+->\s+(\S+)\s+when\s+(.+)$/i;
const ON_LINE = /^on\s+(\S+)\s+(\S+)\s+(\S+)\s+->\s+(\S+)\s*$/i;
const THEN_LINE = /^\s*then\s+(.+)$/i;

export async function parseVision(source, options = {}) {
  const gdlEndpoint = options.gdlEndpoint;
  const lines = source.split(/\r?\n/);
  const doc = {
    id: "",
    title: "",
    plugins: [],
    screens: [],
    fixtures: {},
    catalog: null,
    deck: null,
    transitions: [],
    handlers: [],
  };

  let screen = null;
  let fixtureName = null;
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

    if (/^vision\s+/i.test(trimmed)) {
      doc.id = trimmed.split(/\s+/)[1];
      continue;
    }

    if (/^catalog\s+/i.test(trimmed) && !screen && !fixtureName) {
      const id = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "catalog");
      const wrapped = wrapCatalogDocument(id, block.body);
      doc.catalog = await parseGdlBlock("catalog", wrapped, gdlEndpoint);
      i = block.next;
      continue;
    }

    if (/^deck\s+/i.test(trimmed) && !screen && !fixtureName) {
      const id = trimmed.split(/\s+/)[1];
      const block = readTopLevelBlock(lines, i, "deck");
      const wrapped = wrapDeckDocument(id, block.body);
      doc.deck = await parseGdlBlock("deck", wrapped, gdlEndpoint);
      i = block.next;
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
        blocks: [],
        deck: null,
      };
      doc.screens.push(screen);
      fixtureName = null;
      pendingGo = null;
      continue;
    }

    if (/^fixture\s+/i.test(trimmed)) {
      fixtureName = trimmed.split(/\s+/)[1];
      doc.fixtures[fixtureName] = [];
      pendingGo = null;
      continue;
    }

    if (fixtureName) {
      doc.fixtures[fixtureName].push(trimmed);
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
        block: m[1],
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

    if (!screen) continue;

    let block = null;
    let m;
    if ((block = matchLayout(LAYOUT_ROW, trimmed, "row"))) screen.blocks.push(block);
    else if ((block = matchLayout(LAYOUT_COL, trimmed, "col"))) screen.blocks.push(block);
    else if ((m = trimmed.match(PANEL_LINE))) screen.blocks.push({ kind: "panel", id: m[1] });
    else if ((m = trimmed.match(TREE_LINE))) screen.blocks.push({ kind: "tree", id: m[1] });
    else if ((m = trimmed.match(TABS_LINE))) screen.blocks.push({ kind: "tabs", id: m[1] });
    else if ((m = trimmed.match(PREVIEW_LINE))) screen.blocks.push({ kind: "preview", id: m[1] });
    else if ((m = trimmed.match(REPL_LINE))) screen.blocks.push({ kind: "repl", id: m[1] });
    else if ((m = trimmed.match(PAD_LINE))) screen.blocks.push({ kind: "pad", id: m[1] });
    else if (SEARCH_LINE.test(trimmed)) screen.blocks.push({ kind: "search" });
    else if (COMMAND_LIST_LINE.test(trimmed)) screen.blocks.push({ kind: "command-list" });
    else if (KEYWORD_LINE.test(trimmed)) throw new Error(`Line ${i + 1}: unexpected: ${trimmed}`);
  }

  if (!doc.id) throw new Error("Missing vision id");
  if (!doc.screens.length) throw new Error("No screens");

  for (const h of doc.handlers) {
    const { toScreen, toBlock } = resolveOnTarget(doc, h.block, h.to);
    h.toScreen = toScreen;
    h.toBlock = toBlock;
  }

  return doc;
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
