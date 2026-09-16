/**
 * Layout board sketch — consumes composed IR only (VISION-ADR-0005 §6).
 * Parse lives server-side (LogicalPath import → compose); player never imports parser/.
 */

import { formatBracketBoard, rowPlacements, unplacedRefs } from "./layout-board-placer.js";

/** @typedef {{ columns: number, cards: Record<string, { cardId: string, label: string }>, rows: string[][] }} LayoutBoardIr */

/** @type {Map<string, LayoutBoardIr>} */
const sessions = new Map();

export function resetLayoutBoardSessions() {
  sessions.clear();
}

/** @param {unknown} fixture */
function asLayoutBoardIr(fixture) {
  if (!fixture || typeof fixture !== "object" || fixture.type !== "layout-board") return null;
  return /** @type {LayoutBoardIr} */ (fixture);
}

/** @param {string} componentId @param {unknown} fixture */
export function getLayoutBoardState(componentId, fixture) {
  if (!sessions.has(componentId)) {
    const typed = asLayoutBoardIr(fixture);
    sessions.set(
      componentId,
      typed
        ? {
            columns: typed.columns,
            cards: { ...typed.cards },
            rows: typed.rows.map((r) => [...r]),
          }
        : { columns: 12, cards: {}, rows: [] },
    );
  }
  return sessions.get(componentId);
}

/**
 * @param {HTMLElement} container
 * @param {string} componentId
 * @param {unknown} fixture composed doc.fixtures[id]
 * @param {{ log?: (msg: string) => void, fireHandler?: (event: string, target: string, detail: string) => void }} [opts]
 */
export function renderLayoutBoard(container, componentId, fixture, opts = {}) {
  const state = getLayoutBoardState(componentId, fixture);
  const log = opts.log ?? (() => {});
  const rerender = () => renderLayoutBoard(container, componentId, fixture, opts);

  container.className = "block-body layout-board-root";
  container.replaceChildren();
  container.dataset.componentId = componentId;

  const header = document.createElement("div");
  header.className = "layout-board-header";
  header.innerHTML =
    '<span class="layout-board-title">Tab layout board</span>' +
    '<span class="muted layout-board-meta">columns=' +
    state.columns +
    " · drag refs · bracket SSOT below</span>";
  container.appendChild(header);

  const board = document.createElement("div");
  board.className = "layout-board-rows";
  if (!state.rows.length) board.appendChild(mkMuted("(no rows yet)"));
  for (let rowIdx = 0; rowIdx < state.rows.length; rowIdx++) {
    board.appendChild(mkRow(state, rowIdx, log, rerender, opts));
  }
  const addRow = document.createElement("button");
  addRow.type = "button";
  addRow.className = "layout-board-add-row";
  addRow.textContent = "+ row";
  addRow.addEventListener("click", () => {
    state.rows.push([]);
    log("layout-board: row added");
    rerender();
  });
  board.appendChild(addRow);
  container.appendChild(board);

  const palette = document.createElement("div");
  palette.className = "layout-board-unplaced";
  palette.appendChild(mkLabel("Unplaced"));
  const loose = unplacedRefs(state.cards, state.rows);
  if (!loose.length) palette.appendChild(mkMuted("(all refs placed)"));
  for (const ref of loose) palette.appendChild(mkChip(state, ref));
  container.appendChild(palette);

  const ghost = document.createElement("div");
  ghost.className = "layout-board-ghost";
  ghost.appendChild(mkLabel("Ghost · " + state.columns + "-col"));
  const ghostGrid = document.createElement("div");
  ghostGrid.className = "layout-board-ghost-grid";
  ghostGrid.style.setProperty("--layout-columns", String(state.columns));
  for (let i = 0; i < state.rows.length; i++) {
    const rowEl = document.createElement("div");
    rowEl.className = "layout-board-ghost-row";
    for (const pl of rowPlacements(state.rows[i], state.columns, i + 1)) {
      const cell = document.createElement("div");
      cell.className = "layout-board-ghost-cell";
      cell.style.gridColumn = pl.col + " / span " + pl.span;
      cell.textContent = pl.ref;
      cell.title = state.cards[pl.ref]?.label ?? pl.ref;
      rowEl.appendChild(cell);
    }
    ghostGrid.appendChild(rowEl);
  }
  ghost.appendChild(ghostGrid);
  container.appendChild(ghost);

  const ssot = document.createElement("pre");
  ssot.className = "layout-board-ssot";
  ssot.textContent = formatBracketBoard(state.rows) || "(empty board)";
  container.appendChild(ssot);

  const title = container.parentElement?.querySelector(".block-title");
  if (title && !title.querySelector(".layout-board-badge")) {
    const badge = document.createElement("span");
    badge.className = "badge-fixture layout-board-badge";
    badge.textContent = "FIXTURE · live D&D";
    title.appendChild(badge);
  }
}

/** @param {LayoutBoardIr} state @param {number} rowIdx */
function mkRow(state, rowIdx, log, rerender, opts) {
  const row = document.createElement("div");
  row.className = "layout-board-row";
  row.appendChild(mkLabel("R" + (rowIdx + 1)));
  const cells = document.createElement("div");
  cells.className = "layout-board-cells";
  const tokens = state.rows[rowIdx] ?? [];
  for (let cellIdx = 0; cellIdx < tokens.length; cellIdx++) {
    const cell = document.createElement("div");
    cell.className = "layout-board-cell";
    cell.appendChild(mkChip(state, tokens[cellIdx]));
    wireDrop(cell, state, rowIdx, cellIdx, log, rerender, opts);
    cells.appendChild(cell);
  }
  const tail = document.createElement("div");
  tail.className = "layout-board-cell layout-board-cell-drop";
  tail.textContent = "+";
  wireDrop(tail, state, rowIdx, tokens.length, log, rerender, opts);
  cells.appendChild(tail);
  row.appendChild(cells);
  return row;
}

/** @param {LayoutBoardIr} state @param {string} ref */
function mkChip(state, ref) {
  const meta = state.cards[ref] ?? { cardId: ref, label: ref };
  const chip = document.createElement("div");
  chip.className = "layout-board-chip";
  chip.draggable = true;
  chip.dataset.ref = ref;
  chip.innerHTML =
    '<span class="layout-board-ref">' +
    ref +
    '</span><span class="layout-board-label">' +
    meta.label +
    "</span>";
  chip.title = meta.cardId + " · drag to row";
  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/x-vision-layout-ref", ref);
    e.dataTransfer.setData("text/plain", ref);
    e.dataTransfer.effectAllowed = "move";
    chip.classList.add("is-dragging");
  });
  chip.addEventListener("dragend", () => chip.classList.remove("is-dragging"));
  return chip;
}

function wireDrop(el, state, rowIdx, cellIdx, log, rerender, opts) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    el.classList.add("is-drop-target");
  });
  el.addEventListener("dragleave", () => el.classList.remove("is-drop-target"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("is-drop-target");
    const ref =
      e.dataTransfer.getData("application/x-vision-layout-ref") ||
      e.dataTransfer.getData("text/plain");
    if (!ref || !state.cards[ref]) return;
    moveRef(state, ref, rowIdx, cellIdx);
    log("layout-board drop " + ref + " → row " + (rowIdx + 1) + " · " + formatBracketBoard(state.rows));
    opts.fireHandler?.("drop", "ref", ref + "→row" + (rowIdx + 1));
    rerender();
  });
}

/** @param {LayoutBoardIr} state */
function moveRef(state, ref, toRowIdx, toCellIdx) {
  state.rows = state.rows.map((row) => row.filter((r) => r !== ref));
  while (state.rows.length <= toRowIdx) state.rows.push([]);
  const row = state.rows[toRowIdx];
  const idx = Math.max(0, Math.min(cellIdx, row.length));
  row.splice(idx, 0, ref);
}

function mkLabel(text) {
  const el = document.createElement("div");
  el.className = "layout-board-section-label";
  el.textContent = text;
  return el;
}

function mkMuted(text) {
  const el = document.createElement("span");
  el.className = "muted layout-board-empty";
  el.textContent = text;
  return el;
}
