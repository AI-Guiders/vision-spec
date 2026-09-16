import { parseVision, entryScreen } from "../parser/vision-parser.js";
import { paletteRowsFromCatalog } from "../parser/gdl-ir.js";
import { isLayoutBoundComponent } from "../parser/vision-graph.js";
import { fixtureKeylines, fixtureTreeNodes } from "../parser/fixture-parse.js";
import { resolvePlugins } from "../parser/plugins.js";
import {
  parseReadinessFixtureLines,
  renderEnvironmentReadinessPage,
} from "./environment-readiness-page.js";
import { renderCclBar } from "./ccl-bar.js";
import { renderLayoutBoard, resetLayoutBoardSessions } from "./layout-board.js";
import {
  colorTokenCssVar,
  ensureIconLibraries,
  lookupPresentationColorToken,
  lookupPresentationIcon,
  renderIcon,
} from "./icon-registry.js";

const stage = document.getElementById("stage");
const overlayRoot = document.getElementById("overlay-root");
const logList = document.getElementById("log-list");
const titleEl = document.getElementById("vision-title");
const exampleSelect = document.getElementById("example-select");
const fileInput = document.getElementById("file-input");
const projectOpenBtn = document.getElementById("project-open-btn");
const projectDirInput = document.getElementById("project-dir-input");
const projectHint = document.getElementById("project-hint");
const viewModeSelect = document.getElementById("view-mode");

/** @type {ReturnType<parseVision> | null} */
let doc = null;
let currentScreenId = "";
let overlayScreenId = null;
/** @type {"sketch" | "graph"} */
let viewMode = "sketch";

init();

function showLoadError(err) {
  titleEl.textContent = "Load failed";
  const errP = document.createElement("p");
  errP.className = "load-error";
  errP.textContent = String(err?.message ?? err);
  stage.replaceChildren(errP);
  log(String(err?.message ?? err));
}

async function init() {
  exampleSelect.addEventListener("change", () => loadUrl(exampleSelect.value));
  fileInput.addEventListener("change", onFilePick);
  projectOpenBtn?.addEventListener("click", () => projectDirInput.click());
  projectDirInput.addEventListener("change", onProjectDirPick);
  viewModeSelect.addEventListener("change", () => {
    viewMode = viewModeSelect.value;
    render();
  });
  stage.addEventListener("keydown", onKeyDown);
  overlayRoot.addEventListener("keydown", onKeyDown);

  try {
    await window.__VISION_BOOT__?.catch(() => {});
    if (window.__VISION_INITIAL_DOC__) {
      finishLoad(window.__VISION_INITIAL_DOC__);
    } else {
      await loadUrl(exampleSelect.value);
    }
  } catch (err) {
    showLoadError(err);
  }
}

function normalizeRepoPath(url) {
  const raw = url.replace(/^\//, "").replace(/\\/g, "/");
  const parts = raw.split("/").filter((p) => p && p !== ".");
  while (parts[0] === "..") parts.shift();
  return parts.join("/");
}

async function loadUrl(url) {
  const rel = normalizeRepoPath(url);
  if (rel.endsWith(".visionproj")) {
    const resp = await fetch("/__vision/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: rel }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    finishLoad(await resp.json());
    return;
  }
  if (rel.endsWith(".vision")) {
    const resp = await fetch("/__vision/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: rel }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    finishLoad(await resp.json());
    return;
  }
  const text = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.text();
  });
  await loadText(text);
}

function onFilePick(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  titleEl.textContent = `Loading ${file.name}…`;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await loadText(String(reader.result), file.name);
    } catch (err) {
      showLoadError(err);
    } finally {
      ev.target.value = "";
    }
  };
  reader.onerror = () => showLoadError(reader.error ?? "Failed to read file");
  reader.readAsText(file);
}

function selectManifestPath(manifestPaths) {
  return [...manifestPaths].sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  })[0];
}

async function onProjectDirPick(ev) {
  const fileList = ev.target.files;
  if (!fileList?.length) return;
  titleEl.textContent = "Loading project…";
  try {
    /** @type {Record<string, string>} */
    const manifestTexts = {};
    /** @type {string[]} */
    const manifestPaths = [];
    for (const file of fileList) {
      const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
      if (!rel.endsWith(".visionproj")) continue;
      manifestPaths.push(rel);
      manifestTexts[rel] = await file.text();
    }
    if (!manifestPaths.length) {
      throw new Error(
        "V-P003: No .visionproj in selected folder — choose the directory that contains your .visionproj (e.g. examples/)",
      );
    }
    const manifestRel = selectManifestPath(manifestPaths);
    /** @type {Record<string, string>} */
    const visionFiles = {};
    for (const file of fileList) {
      const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
      if (!rel.endsWith(".vision")) continue;
      visionFiles[rel] = await file.text();
    }
    const resp = await fetch("/__vision/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifestSource: manifestTexts[manifestRel],
        manifestRel,
        files: visionFiles,
      }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    finishLoad(await resp.json());
    log(`Loaded project ${manifestRel}`);
  } catch (err) {
    showLoadError(err);
  } finally {
    ev.target.value = "";
  }
}

function hasImportDirectives(source) {
  return /^\s*import\s+/m.test(source) || /^\s*!include\s+/m.test(source);
}

function finishLoad(loaded) {
  resetLayoutBoardSessions();
  doc = loaded;
  ensureIconLibraries(doc);
  titleEl.textContent = doc.title || doc.id;
  currentScreenId = entryScreen(doc).id;
  overlayScreenId = null;
  logList.innerHTML = "";
  render();
  log(`Loaded vision ${doc.id}`);
  if (viewMode === "sketch") stage.focus();
}

async function loadText(source, fileName = "") {
  if (hasImportDirectives(source)) {
    const singleFile = fileName || "entry.vision";
    const resp = await fetch("/__vision/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryPath: singleFile,
        files: { [singleFile]: source },
        projectRoot: "",
      }),
    });
    if (resp.ok) {
      finishLoad(await resp.json());
      return;
    }
    throw new Error(
      "This .vision file uses import directives. Use Open project and select the folder containing a .visionproj manifest.",
    );
  }
  doc = await parseVision(source, { gdlEndpoint: "/__vision/gdl" });
  finishLoad(doc);
}


async function renderGraphView() {
  const { renderTransitionGraph } = await import("./transition-graph.js");
  const graphWrap = renderTransitionGraph(doc, {
    activeScreenId: currentScreenId,
    overlayScreenId,
    onSelectScreen: (id) => {
      const screen = doc.screens.find((s) => s.id === id);
      if (screen?.overlay) {
        overlayScreenId = id;
      } else {
        currentScreenId = id;
        overlayScreenId = null;
      }
      viewMode = "sketch";
      viewModeSelect.value = "sketch";
      render();
      log(`Graph → sketch: ${id}`);
      stage.focus();
    },
  });
  stage.appendChild(graphWrap);
  void graphWrap.initGraph();
}

function render() {
  stage.firstChild?.destroyGraph?.();
  stage.innerHTML = "";
  overlayRoot.innerHTML = "";
  overlayRoot.classList.add("hidden");
  overlayRoot.setAttribute("aria-hidden", "true");

  if (!doc) return;

  stage.classList.toggle("stage-graph", viewMode === "graph");
  stage.classList.toggle("stage-sketch", viewMode !== "graph");

  if (viewMode === "graph") {
    void renderGraphView();
    return;
  }

  const base = doc.screens.find((s) => s.id === currentScreenId);
  if (!base) return;
  stage.appendChild(renderScreen(base, false));

  if (overlayScreenId) {
    const overlay = doc.screens.find((s) => s.id === overlayScreenId);
    if (overlay) {
      overlayRoot.classList.remove("hidden");
      overlayRoot.setAttribute("aria-hidden", "false");
      overlayRoot.appendChild(renderScreen(overlay, true));
    }
  }
}

function renderScreen(screen, isOverlay) {
  const root = document.createElement("div");
  root.className = "screen";
  root.dataset.screenId = screen.id;

  if (!isOverlay && screen.deck) {
    for (const plugin of resolvePlugins(doc)) {
      const deckRoot = plugin.renderScreen?.(screen, {
        renderZone: (zoneId) => {
          const comp = findComponent(screen, zoneId);
          return comp ? renderComponent(comp, screen) : null;
        },
        labelForZone: zoneLabel,
        deckBandForZone: (zoneId) => doc.presentations?.[zoneId]?.deckBand ?? null,
        zonePlacementHint: (zoneId) => doc.presentations?.[zoneId] ?? null,
      });
      if (deckRoot) {
        root.appendChild(deckRoot);
        return root;
      }
    }
  }

  if (isOverlay && screenHasCommandPalette(screen)) {
    const panel = document.createElement("div");
    panel.className = "sketch-block overlay-card palette-panel";
    const body = document.createElement("div");
    body.className = "block-body palette-body";
    panel.appendChild(body);
    renderCommandPalette(body);
    root.appendChild(panel);
    setTimeout(() => {
      const search = root.querySelector(".palette-search");
      search?.focus();
    }, 0);
    return root;
  }

  for (const layout of screen.layout ?? []) {
    root.appendChild(renderLayout(layout, screen));
  }

  for (const comp of screen.components) {
    if (isLayoutBoundComponent(comp, screen, doc)) continue;
    root.appendChild(renderComponent(comp, screen));
  }

  if (isOverlay) {
    const card = root.querySelector(".sketch-block") ?? root;
    if (card.classList) card.classList.add("overlay-card");
    setTimeout(() => {
      const search = root.querySelector(".search-input");
      search?.focus();
    }, 0);
  }

  return root;
}

function screenHasCommandPalette(screen) {
  return screen.components.some((c) => c.kind === "command-list");
}

function renderLayout(layout, screen) {
  const row = document.createElement("div");
  row.className = layout.kind === "row" ? "sketch-row" : "sketch-col";
  for (const slotId of layout.slots) {
    const slot = document.createElement("div");
    slot.className = "sketch-slot";
    const nested = findComponent(screen, slotId);
    if (nested) slot.appendChild(renderComponent(nested, screen));
    else slot.appendChild(placeholder(slotId));
    row.appendChild(slot);
  }
  return row;
}

function renderComponent(comp, screen) {
  const wrap = document.createElement("div");
  wrap.className = "sketch-block";
  if (comp.kind === "panel" && comp.id === "resolve") wrap.classList.add("panel-resolve");

  const title = document.createElement("div");
  title.className = "block-title";
  title.textContent = componentLabel(comp);
  wrap.appendChild(title);

  const body = document.createElement("div");
  body.className = "block-body";
  wrap.appendChild(body);

  switch (comp.kind) {
    case "tree":
      renderTree(body, comp.id);
      break;
    case "tabs":
      renderTabs(body, comp.id);
      break;
    case "preview":
      body.innerHTML = `<div class="preview-placeholder">Preview sketch<br/><span class="muted">${comp.id}</span></div>`;
      break;
    case "search":
      if (doc.presentations?.[comp.id]?.renderAs === "ccl-bar") {
        wrap.classList.add("ccl-panel");
        title.remove();
        renderCclBar(body);
      } else {
        body.innerHTML = `<input class="search-input" placeholder="Search or run command…" />`;
      }
      break;
    case "command-list":
      renderCommandList(body);
      break;
    case "panel":
      if (comp.id === "environment-readiness") {
        wrap.classList.add("readiness-quiet");
        title.remove();
        renderEnvironmentReadiness(body, comp.id);
      } else if (comp.id === "resolve") {
        wrap.classList.add("resolve-quiet");
        title.remove();
      } else if (comp.id === "layout-board") {
        wrap.classList.add("layout-board-panel");
        title.remove();
        renderLayoutBoard(body, comp.id, doc.fixtures[comp.id], {
          log,
          fireHandler: (event, target, detail) => {
            const h = doc.handlers.find(
              (x) => x.component === comp.id && x.event === event && x.target === target,
            );
            if (h) fireHandler(comp.id, event, target, detail);
            else log(`layout-board ${event} ${target}: ${detail}`);
          },
        });
      } else {
        body.textContent = `${comp.id} panel`;
      }
      break;
    case "repl":
      if (comp.id === "data-lab") renderDataLab(body, comp.id);
      else renderRepl(body, comp.id);
      break;
    case "pad":
      renderPad(body, comp.id);
      break;
    default:
      body.textContent = comp.kind;
  }

  return wrap;
}

function findComponent(screen, id) {
  return screen.components.find(
    (c) =>
      c.id === id &&
      ["tree", "tabs", "preview", "panel", "repl", "pad", "search", "command-list"].includes(
        c.kind,
      ),
  );
}

function zoneLabel(zoneId) {
  const pres = doc?.presentations?.[zoneId];
  if (pres?.label) return pres.label;
  const row = doc?.componentRegistry?.rows?.find((r) => r.id === zoneId);
  if (row?.label) return row.label;
  const labels = {
    "spec-tree": "Project Browser",
    editor: "Document editor",
    "report-preview": "Report preview",
    "environment-readiness": "Готовность окружения",
    "data-lab": "SQL Browser",
    "script-pad": "Script Pad",
    "layout-board": "Layout board",
    ccl: "Command line",
    resolve: "Project issues",
    palette: "Command palette",
  };
  return labels[zoneId] ?? zoneId;
}

function renderRepl(container, fixtureId) {
  const lines = fixture(fixtureId);
  if (!lines.length) {
    container.textContent = "REPL · schema · grid";
    return;
  }
  for (const line of lines) {
    const div = document.createElement("div");
    div.className = "repl-line";
    div.textContent = line;
    container.appendChild(div);
  }
}

function normalizeReadinessKeyline(line) {
  const t = line.trim();
  const connector = t.match(/^connector\s+(.+)$/i);
  if (connector) return `connector: ${connector[1]}`;
  const schema = t.match(/^schema\s+(.+)$/i);
  if (schema) return `schema: ${schema[1]}`;
  return t;
}

function renderEnvironmentReadiness(container, fixtureId) {
  const lines = fixture(fixtureId).map(normalizeReadinessKeyline);
  const rows = parseReadinessFixtureLines(lines);
  container.className = "block-body readiness-page-root";
  renderEnvironmentReadinessPage(container, rows);
}

function renderDataLab(container, fixtureId) {
  const lines = fixture(fixtureId);
  const replLines = lines.filter((line) => /^\s*repl\b/i.test(line) || /^\s*repl:/i.test(line));
  container.className = "block-body data-lab-sketch";
  const replBody = document.createElement("div");
  replBody.className = "data-lab-pane-body data-lab-repl-only";
  for (const line of replLines) {
    const div = document.createElement("div");
    div.className = "repl-line";
    div.textContent = line.replace(/^\s*repl:?\s*/i, "");
    replBody.appendChild(div);
  }
  if (!replLines.length) replBody.textContent = "SELECT … · grid";
  container.appendChild(replBody);
}

function renderPad(container, fixtureId) {
  const lines = fixture(fixtureId);
  container.className = "block-body pad-sketch";
  if (!lines.length) {
    container.textContent = "> create report with …";
    return;
  }
  for (const line of lines) {
    const div = document.createElement("div");
    div.className = "pad-line";
    div.textContent = line;
    container.appendChild(div);
  }
}

function placeholder(id) {
  const d = document.createElement("div");
  d.className = "sketch-block";
  d.innerHTML = `<div class="block-title">${id}</div><div class="block-body muted">slot</div>`;
  return d;
}

function componentLabel(comp) {
  if (comp.kind === "search") return "search";
  if (comp.kind === "command-list") return zoneLabel(comp.id);
  return zoneLabel(comp.id);
}

function fixture(name) {
  const fix = doc.fixtures[name];
  if (!fix) {
    const palette = doc.fixtures.palette ?? doc.fixtures["command-list"];
    return fixtureKeylines(palette ?? { type: "keylines", lines: [] });
  }
  return fixtureKeylines(fix);
}

function renderTree(container, componentId) {
  const fix = doc.fixtures[componentId];
  const nodes = fixtureTreeNodes(fix ?? { type: "keylines", lines: [] });
  if (!nodes.length) {
    container.textContent = "(no fixture)";
    return;
  }
  renderTreeNodes(container, nodes, componentId, 0);
  const badge = document.createElement("span");
  badge.className = "badge-fixture";
  badge.textContent = "FIXTURE DATA";
  container.parentElement?.querySelector(".block-title")?.appendChild(badge);
}

function renderTreeNodes(container, nodes, componentId, depth) {
  for (const node of nodes) {
    const row = document.createElement("div");
    row.className = "tree-row";
    row.style.paddingLeft = `${depth * 14}px`;

    const iconEl = document.createElement("span");
    iconEl.className = "tree-icon";
    const artifactKind = node.kind === "folder" ? "folder" : node.artifactKind;
    renderIcon(iconEl, lookupPresentationIcon(doc, componentId, artifactKind));

    const colorToken = lookupPresentationColorToken(doc, componentId, artifactKind);
    const cssVar = colorTokenCssVar(colorToken);
    if (cssVar) row.style.color = `var(${cssVar})`;

    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = node.kind === "folder" ? node.name : node.path;

    row.appendChild(iconEl);
    row.appendChild(label);

    if (node.kind === "file") {
      row.title = "Double-click to open";
      row.addEventListener("dblclick", () => {
        fireHandler(componentId, "double-click", "file", node.path);
      });
    }

    container.appendChild(row);
    if (node.kind === "folder") renderTreeNodes(container, node.children, componentId, depth + 1);
  }
}

function renderTabs(container, id) {
  const bar = document.createElement("div");
  bar.className = "tabs-bar";
  ["Welcome", "demo-soak.dashspec"].forEach((t, i) => {
    const tab = document.createElement("span");
    tab.className = "tab" + (i === 1 ? " active" : "");
    tab.textContent = t;
    bar.appendChild(tab);
  });
  container.appendChild(bar);
  const editor = document.createElement("div");
  editor.className = "preview-placeholder";
  editor.textContent = `${id} · editor sketch`;
  container.appendChild(editor);
}

function renderCommandList(container) {
  renderCommandPalette(container);
}

/** @param {string} line */
function parseCommandFixtureLine(line) {
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length <= 1) {
    return { title: line.trim(), invoke: "", hotkey: "", help: "" };
  }
  const [title, invoke = "", hotkey = "", help = ""] = parts;
  return { title, invoke, hotkey, help };
}

function paletteFuzzyMatch(query, cmd) {
  if (!query) return true;
  const hay = `${cmd.title} ${cmd.invoke} ${cmd.help}`.toLowerCase();
  const q = query.toLowerCase().trim();
  let i = 0;
  for (const ch of q) {
    i = hay.indexOf(ch, i);
    if (i === -1) return false;
    i += 1;
  }
  return true;
}

function paletteCommands() {
  const fromCatalog = paletteRowsFromCatalog(doc?.catalog);
  if (fromCatalog.length) return fromCatalog;
  return fixture("palette").map(parseCommandFixtureLine);
}

function renderCommandPalette(container) {
  const commands = paletteCommands();
  let selected = 0;

  const search = document.createElement("input");
  search.className = "palette-search search-input";
  search.type = "search";
  search.placeholder = "Type to filter commands…";
  search.setAttribute("aria-label", "Filter commands");
  container.appendChild(search);

  const list = document.createElement("ul");
  list.className = "palette-list";
  container.appendChild(list);

  const footer = document.createElement("div");
  footer.className = "palette-footer muted";
  footer.textContent = "↑↓ navigate · Enter run · Esc close · or type / in cockpit";
  container.appendChild(footer);

  function runCommand(cmd) {
    transition("select-command", cmd.title);
  }

  function paint() {
    const query = search.value;
    const visible = commands.filter((cmd) => paletteFuzzyMatch(query, cmd));
    if (selected >= visible.length) selected = Math.max(0, visible.length - 1);

    list.replaceChildren();
    visible.forEach((cmd, index) => {
      const li = document.createElement("li");
      li.className = "palette-item" + (index === selected ? " selected" : "");
      li.tabIndex = -1;

      const main = document.createElement("div");
      main.className = "palette-item-main";

      const title = document.createElement("span");
      title.className = "palette-item-title";
      title.textContent = cmd.title;
      main.appendChild(title);

      if (cmd.hotkey && cmd.hotkey !== "·") {
        const key = document.createElement("kbd");
        key.className = "palette-hotkey";
        key.textContent = cmd.hotkey;
        main.appendChild(key);
      }

      li.appendChild(main);

      const meta = document.createElement("div");
      meta.className = "palette-item-meta";
      const invoke = document.createElement("code");
      invoke.className = "palette-invoke";
      invoke.textContent = cmd.invoke || "(no slash path)";
      meta.appendChild(invoke);
      if (cmd.help) {
        const help = document.createElement("span");
        help.className = "palette-help";
        help.textContent = cmd.help;
        meta.appendChild(help);
      }
      li.appendChild(meta);

      li.addEventListener("mouseenter", () => {
        selected = index;
        paint();
      });
      li.addEventListener("click", () => runCommand(cmd));
      list.appendChild(li);
    });

    if (!visible.length) {
      const empty = document.createElement("li");
      empty.className = "palette-empty muted";
      empty.textContent = "No matching commands";
      list.appendChild(empty);
    }
  }

  search.addEventListener("input", () => {
    selected = 0;
    paint();
  });

  search.addEventListener("keydown", (e) => {
    const visible = commands.filter((cmd) => paletteFuzzyMatch(search.value, cmd));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selected = visible.length ? (selected + 1) % visible.length : 0;
      paint();
      list.querySelector(".palette-item.selected")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selected = visible.length ? (selected - 1 + visible.length) % visible.length : 0;
      paint();
      list.querySelector(".palette-item.selected")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = visible[selected];
      if (cmd) runCommand(cmd);
    }
  });

  paint();
}

function onKeyDown(e) {
  if (!doc) return;

  if (overlayScreenId === "command-palette") {
    if (e.key === "Escape") {
      e.preventDefault();
      transition("Escape");
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const search = overlayRoot.querySelector(".palette-search");
      if (search) {
        search.focus();
        search.select();
      }
      return;
    }
    return;
  }

  let trigger = null;
  if (e.key === "Escape") trigger = "Escape";
  else if (e.ctrlKey && e.key.toLowerCase() === "k") trigger = "Ctrl+K";
  else if (e.key === "Enter") trigger = "Enter";
  else if (e.key === "F12") trigger = "F12";
  if (trigger) {
    e.preventDefault();
    transition(trigger);
  }
}

function transition(when, detail) {
  const from = overlayScreenId ?? currentScreenId;
  const go = doc.transitions.find(
    (t) => t.from === from && t.when.toLowerCase() === when.toLowerCase(),
  );
  if (!go) {
    log(`No transition: ${from} when ${when}`);
    return;
  }

  const target = doc.screens.find((s) => s.id === go.to);
  if (target?.overlay) {
    overlayScreenId = target.id;
  } else {
    currentScreenId = go.to;
    overlayScreenId = null;
  }

  const msg = go.then
    ? `${from} → ${go.to} (${when}) — ${go.then}${detail ? `: ${detail}` : ""}`
    : `${from} → ${go.to} (${when})${detail ? `: ${detail}` : ""}`;
  log(msg);
  render();
  stage.focus();
}

function fireHandler(component, event, target, detail) {
  const h = doc.handlers.find(
    (x) => x.component === component && x.event === event && x.target === target,
  );
  if (!h) {
    log(`No handler: ${component} ${event} ${target}`);
    return;
  }
  currentScreenId = h.toScreen ?? h.to;
  overlayScreenId = null;
  const dest = h.toComponent
    ? `${h.toComponent} (${h.toScreen ?? h.to})`
    : (h.toScreen ?? h.to);
  log(
    h.then
      ? `${component} ${event} → ${dest} — ${h.then}: ${detail}`
      : `${component} ${event} → ${dest}: ${detail}`,
  );
  render();
  stage.focus();
}

function log(message) {
  const li = document.createElement("li");
  li.textContent = message;
  logList.prepend(li);
}
