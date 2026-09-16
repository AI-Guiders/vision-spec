/**
 * Markdown pipe-table parser for VisionSpec sections.
 */

/**
 * @param {string[]} lines
 * @param {number} start index of header row (| col | col |)
 * @returns {{ headers: string[], rows: string[][], next: number }}
 */
export function parsePipeTable(lines, start) {
  const headerLine = lines[start]?.trim() ?? "";
  if (!headerLine.startsWith("|")) throw new Error(`Line ${start + 1}: expected table header`);
  const sepLine = lines[start + 1]?.trim() ?? "";
  let dataStart = start + 1;
  if (/^\|[-\s:|]+\|$/.test(sepLine)) {
    dataStart = start + 2;
  } else if (!sepLine.startsWith("|")) {
    throw new Error(`Line ${start + 2}: expected table separator`);
  }

  const headers = splitRow(headerLine);
  /** @type {string[][]} */
  const rows = [];
  let i = dataStart;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t.startsWith("|")) break;
    rows.push(splitRow(t));
    i += 1;
  }
  return { headers, rows, next: i };
}

/** @param {string} line */
function splitRow(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

/**
 * @param {string[]} headers
 * @param {string[]} row
 * @returns {Record<string, string>}
 */
export function rowToRecord(headers, row) {
  /** @type {Record<string, string>} */
  const rec = {};
  headers.forEach((h, idx) => {
    rec[h] = row[idx] ?? "";
  });
  return rec;
}
