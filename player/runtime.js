import { parseVision, entryScreen } from "../parser/vision-parser.js";
import { isLayoutBoundBlock } from "../parser/vision-graph.js";
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

  for (const block of screen.blocks) {
    if (isLayoutBoundBlock(block, screen)) continue;
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
      body.textContent = block.id === "resolve"
        ? "Resolve OK — federation graph (fixture)"
        : `${block.id} panel`;
      break;
    default:
      body.textContent = block.kind;
  }

  return wrap;
}

function findBlock(screen, id) {
  return screen.blocks.find(
    (b) => b.id === id && ["tree", "tabs", "preview", "panel"].includes(b.kind),
  );
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
  const ul = document.createElement("ul");
  ul.style.padding = "0";
  ul.style.margin = "0";
  for (const cmd of fixture("command-list")) {
    const li = document.createElement("li");
    li.className = "cmd-item";
    li.tabIndex = 0;
    li.textContent = cmd;
    li.addEventListener("click", () => transition("select-command", cmd));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter") transition("select-command", cmd);
    });
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function onKeyDown(e) {
  if (!doc) return;
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
  currentScreenId = h.to;
  overlayScreenId = null;
  log(
    h.then
      ? `${block} ${event} → ${h.to} — ${h.then}: ${detail}`
      : `${block} ${event} → ${h.to}: ${detail}`,
  );
  render();
  stage.focus();
}

function log(message) {
  const li = document.createElement("li");
  li.textContent = message;
  logList.prepend(li);
}
