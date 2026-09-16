/**
 * Bracket board → 12-col placements (DashSpec ADR-0020 TabLayoutBoardResolver).
 */

/** @param {string[]} rowTokens @param {number} columns @param {number} rowIndex */
export function rowPlacements(rowTokens, columns, rowIndex = 1) {
  const n = rowTokens.length;
  if (!n) return [];
  const span = Math.max(1, Math.floor(columns / n));
  return rowTokens.map((ref, i) => ({
    ref,
    row: rowIndex,
    col: 1 + i * span,
    span: i === n - 1 ? columns - i * span : span,
  }));
}

/** @param {string[][]} rows @param {number} columns */
export function boardPlacements(rows, columns) {
  /** @type {{ ref: string, row: number, col: number, span: number }[]} */
  const out = [];
  rows.forEach((tokens, i) => {
    out.push(...rowPlacements(tokens, columns, i + 1));
  });
  return out;
}

/** @param {string[][]} rows */
export function formatBracketBoard(rows) {
  return rows.map((r) => `[ ${r.join(" ")} ]`).join("\n");
}

/** @param {Record<string, { cardId: string, label: string }>} cards @param {string[][]} rows */
export function unplacedRefs(cards, rows) {
  const placed = new Set(rows.flat());
  return Object.keys(cards).filter((ref) => !placed.has(ref));
}
