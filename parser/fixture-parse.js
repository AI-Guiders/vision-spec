/**
 * Typed fixture parsers (tree + keylines + layout-board).
 */

const FOLDER_LINE = /^folder\s+(.+)$/i;
const FILE_LINE = /^file\s+(\S+)\s+(\S+)\s*$/i;
const COLUMNS_LINE = /^columns\s+(\d+)\s*$/i;
const CARD_LINE = /^card\s+(\S+)\s+(\S+)\s+(.+)$/i;
const ROW_LINE = /^row\s+(.+)$/i;

/**
 * @param {string[]} bodyLines lines inside fixture block (indented)
 * @returns {{ type: "tree", nodes: import("./vision-parser.js").TreeFixtureNode[] } | { type: "keylines", lines: string[] }}
 */
export function parseFixtureBody(bodyLines) {
  const trimmed = bodyLines.map((l) => l.trimEnd()).filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (!trimmed.length) return { type: "keylines", lines: [] };

  const first = trimmed[0].trim();
  if (FOLDER_LINE.test(first) || FILE_LINE.test(first)) {
    return { type: "tree", nodes: parseTreeNodes(trimmed) };
  }
  if (trimmed.some((l) => isLayoutBoardLine(l.trim()))) {
    return parseLayoutBoardFixture(trimmed);
  }
  return { type: "keylines", lines: trimmed.map((l) => l.trim()) };
}

/**
 * @param {string[]} lines
 */
function parseTreeNodes(lines) {
  /** @type {import("./vision-parser.js").TreeFixtureNode[]} */
  const roots = [];
  /** @type {{ depth: number, children: import("./vision-parser.js").TreeFixtureNode[] }[]} */
  const stack = [{ depth: -1, children: roots }];

  for (const raw of lines) {
    const depth = indentDepth(raw);
    const text = raw.trim();
    let node;
    const folder = text.match(FOLDER_LINE);
    if (folder) {
      node = { kind: "folder", name: folder[1].trim(), children: [] };
    } else {
      const file = text.match(FILE_LINE);
      if (!file) throw new Error(`Invalid tree fixture line: ${text}`);
      node = { kind: "file", path: file[1], artifactKind: file[2] };
    }

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    parent.children.push(node);
    if (node.kind === "folder") stack.push({ depth, children: node.children });
  }

  return roots;
}

/** @param {string} text */
function isLayoutBoardLine(text) {
  return (
    COLUMNS_LINE.test(text) ||
    CARD_LINE.test(text) ||
    ROW_LINE.test(text)
  );
}

/** @param {string[]} lines */
function parseLayoutBoardFixture(lines) {
  /** @type {Record<string, { cardId: string, label: string }>} */
  const cards = {};
  /** @type {string[][]} */
  const rows = [];
  let columns = 12;
  for (const raw of lines) {
    const text = raw.trim();
    const col = text.match(COLUMNS_LINE);
    if (col) {
      columns = Number(col[1]) || 12;
      continue;
    }
    const card = text.match(CARD_LINE);
    if (card) {
      const ref = card[1];
      const label = card[3].replace(/^"|"$/g, "").trim();
      cards[ref] = { cardId: card[2], label };
      continue;
    }
    const row = text.match(ROW_LINE);
    if (row) {
      rows.push(row[1].split(/\s+/).filter(Boolean));
    }
  }
  return { type: "layout-board", columns, cards, rows };
}

/** @param {string} line */
function indentDepth(line) {
  const m = line.match(/^(\s*)/);
  const spaces = m?.[1]?.length ?? 0;
  return Math.floor(spaces / 2);
}

/** @param {{ type: "tree", nodes: any[] } | { type: "keylines", lines: string[] }} fixture */
export function fixtureKeylines(fixture) {
  if (fixture.type === "keylines") return fixture.lines;
  return [];
}

/** @param {{ type: "tree", nodes: any[] } | { type: "keylines", lines: string[] }} fixture */
export function fixtureTreeNodes(fixture) {
  if (fixture.type === "tree") return fixture.nodes;
  return [];
}

/** @param {any} fixture */
export function fixtureLayoutBoard(fixture) {
  if (fixture?.type === "layout-board") return fixture;
  return null;
}
