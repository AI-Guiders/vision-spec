import { parseVision, entryScreen } from "../parser/vision-parser.js";
import { paletteRowsFromCatalog } from "../parser/gdl-inline.js";
import { isLayoutBoundBlock } from "../parser/vision-graph.js";
import { resolvePlugins } from "../parser/plugins.js";
import { renderTransitionGraph } from "./transition-graph.js";
const stage = document.getElementById("stage");
const overlayRoot = document.getElementById("overlay-root");
const logList = document.getElementById("log-list");
const titleEl = document.getElementById("vision-title");
const exampleSelect = document.getElementById("example-select");
const fileInput = document.getElementById("file-input");
const viewModeSelect = document.getElementById("view-mode");

/** @type {ReturnType<parseVision> | null} */
let doc = null;
let currentScreenId = "";
let overlayScreenId = null;
/** @type {"sketch" | "graph"} */
let viewMode = "sketch";

const keyTriggers = new Map([
  ["k", "Ctrl+K"],
  ["escape", "Escape"],
  ["enter", "Enter"],
]);

init();

async function init() {
  exampleSelect.addEventListener("change", () => loadUrl(exampleSelect.value));
  fileInput.addEventListener("change", onFilePick);
  viewModeSelect.addEventListener("change", () => {
    viewMode = viewModeSelect.value;
    render();
  });
  stage.addEventListener("keydown", onKeyDown);
  overlayRoot.addEventListener("keydown", onKeyDown);

  await loadUrl(exampleSelect.value);
}

async function loadUrl(url) {
  const text = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.text();
  });
  loadText(text);
}

function onFilePick(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result));
  reader.readAsText(file);
}

function loadText(source) {
  doc = parseVision(source);
  titleEl.textContent = doc.title || doc.id;
  currentScreenId = entryScreen(doc).id;
  overlayScreenId = null;
  logList.innerHTML = "";
  render();
  log(`Loaded vision ${doc.id}`);
  if (viewMode === "sketch") stage.focus();
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
    graphWrap.initGraph();
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
          const block = findBlock(screen, zoneId);
          return block ? renderBlock(block, screen) : null;
        },
        labelForZone: zoneLabel,
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

  for (const block of screen.blocks) {
    if (isLayoutBoundBlock(block, screen, doc)) continue;
    root.appendChild(renderBlock(block, screen));
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
  return screen.blocks.some((b) => b.kind === "command-list");
}

function screenHasCommandPalette(screen) {
  return screen.blocks.some((b) => b.kind === "command-list");
}

function renderBlock(block, screen) {
  if (block.kind === "row" || block.kind === "col") {
    const row = document.createElement("div");
    row.className = block.kind === "row" ? "sketch-row" : "sketch-col";
    for (const slotId of block.slots) {
      const slot = document.createElement("div");
      slot.className = "sketch-slot";
      const nested = findBlock(screen, slotId);
      if (nested) slot.appendChild(renderBlock(nested, screen));
      else slot.appendChild(placeholder(slotId));
      row.appendChild(slot);
    }
    return row;
  }

  const wrap = document.createElement("div");
  wrap.className = "sketch-block";
  if (block.kind === "panel" && block.id === "resolve") wrap.classList.add("panel-resolve");

  const title = document.createElement("div");
  title.className = "block-title";
  title.textContent = blockLabel(block);
  wrap.appendChild(title);

  const body = document.createElement("div");
  body.className = "block-body";
  wrap.appendChild(body);

  switch (block.kind) {
    case "tree":
      renderTree(body, block.id);
      break;
    case "tabs":
      renderTabs(body, block.id);
      break;
    case "preview":
      body.innerHTML = `<div class="preview-placeholder">Preview sketch<br/><span class="muted">${block.id}</span></div>`;
      break;
    case "search":
      body.innerHTML = `<input class="search-input" placeholder="Search or run command…" />`;
      break;
    case "command-list":
      renderCommandList(body);
      break;
    case "panel":
      if (block.id === "resolve") {
        wrap.classList.add("resolve-quiet");
        title.remove();
        /* Dark Cockpit: EICAS silent when project has no issues */
      } else if (block.id === "layout-board") {
        body.innerHTML = `<div class="layout-board-sketch muted">Layout board · Phase 2<br/>grammar exists · drag UI later</div>`;
      } else {
        body.textContent = `${block.id} panel`;
      }
      break;
    case "repl":
      if (block.id === "data-lab") renderDataLab(body, block.id);
      else renderRepl(body, block.id);
      break;
    case "pad":
      renderPad(body, block.id);
      break;
    default:
      body.textContent = block.kind;
  }

  return wrap;
}

function findBlock(screen, id) {
  return screen.blocks.find(
    (b) => b.id === id && ["tree", "tabs", "preview", "panel", "repl", "pad"].includes(b.kind),
  );
}

function zoneLabel(zoneId) {
  const labels = {
    "spec-tree": "Project Browser",
    editor: "Document editor",
    "report-preview": "Report preview",
    "data-lab": "SQL Browser",
    "script-pad": "Script Pad",
    "layout-board": "Layout board",
    resolve: "Project issues",
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

function renderDataLab(container, fixtureId) {
  const lines = fixture(fixtureId);
  container.className = "block-body data-lab-sketch";
  const grid = document.createElement("div");
  grid.className = "data-lab-grid";

  const sources = document.createElement("div");
  sources.className = "data-lab-pane";
  sources.innerHTML = `<div class="data-lab-pane-title">Sources</div><div class="data-lab-pane-body">${lines[0] ?? "connector …"}</div>`;

  const schema = document.createElement("div");
  schema.className = "data-lab-pane";
  schema.innerHTML = `<div class="data-lab-pane-title">Schema</div><div class="data-lab-pane-body">${lines[1] ?? "schema tree …"}</div>`;

  const repl = document.createElement("div");
  repl.className = "data-lab-pane data-lab-pane-wide";
  const replTitle = document.createElement("div");
  replTitle.className = "data-lab-pane-title";
  replTitle.textContent = "REPL + grid";
  repl.appendChild(replTitle);
  const replBody = document.createElement("div");
  replBody.className = "data-lab-pane-body";
  for (const line of lines.slice(2)) {
    const div = document.createElement("div");
    div.className = "repl-line";
    div.textContent = line;
    replBody.appendChild(div);
  }
  if (lines.length <= 2) replBody.textContent = "SELECT … · grid";
  repl.appendChild(replBody);

  grid.appendChild(sources);
  grid.appendChild(schema);
  grid.appendChild(repl);
  container.appendChild(grid);
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

function blockLabel(block) {
  if (block.kind === "search") return "search";
  if (block.kind === "command-list") return "command-list";
  return `${block.kind}${block.id ? ` · ${block.id}` : ""}`;
}

function fixture(name) {
  return doc.fixtures[name] ?? doc.fixtures["command-list"] ?? [];
}

function renderTree(container, fixtureId) {
  const items = fixture(fixtureId);
  if (!items.length) {
    container.textContent = "(no fixture)";
    return;
  }
  for (const item of items) {
    const div = document.createElement("div");
    div.className = "tree-item";
    div.textContent = item;
    div.title = "Double-click to open";
    div.addEventListener("dblclick", () => {
      fireHandler(fixtureId, "double-click", "file", item);
    });
    container.appendChild(div);
  }
  const badge = document.createElement("span");
  badge.className = "badge-fixture";
  badge.textContent = "FIXTURE";
  container.parentElement?.querySelector(".block-title")?.appendChild(badge);
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
  return fixture("command-list").map(parseCommandFixtureLine);
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

function fireHandler(block, event, target, detail) {
  const h = doc.handlers.find(
    (x) =>
      x.block === block &&
      x.event === event &&
      x.target === target,
  );
  if (!h) {
    log(`No handler: ${block} ${event} ${target}`);
    return;
  }
  currentScreenId = h.toScreen ?? h.to;
  overlayScreenId = null;
  const dest = h.toBlock ? `${h.toBlock} (${h.toScreen ?? h.to})` : (h.toScreen ?? h.to);
  log(
    h.then
      ? `${block} ${event} → ${dest} — ${h.then}: ${detail}`
      : `${block} ${event} → ${dest}: ${detail}`,
  );
  render();
  stage.focus();
}

function log(message) {
  const li = document.createElement("li");
  li.textContent = message;
  logList.prepend(li);
}
