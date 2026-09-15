/**
 * VisionSpec section router — extracts GDL spans from .vision; does not parse GDL grammar.
 */

/**
 * @param {string[]} allLines
 * @param {number} start line index of opening `catalog` / `deck`
 * @param {string} closeKw
 */
export function readTopLevelBlock(allLines, start, closeKw) {
  const body = [];
  let i = start + 1;
  const endRe = new RegExp(`^end\\s+${closeKw}\\s*$`, "i");
  while (i < allLines.length) {
    const t = allLines[i].trim();
    if (endRe.test(t)) return { body, next: i + 1 };
    body.push(allLines[i]);
    i += 1;
  }
  throw new Error(`Missing end ${closeKw}`);
}

/** @param {string} id @param {string[]} bodyLines */
export function wrapCatalogDocument(id, bodyLines) {
  return `catalog ${id}\n${bodyLines.join("\n")}\nend catalog\n`;
}

/** @param {string} id @param {string[]} bodyLines */
export function wrapDeckDocument(id, bodyLines) {
  return `deck ${id}\n${bodyLines.join("\n")}\nend deck\n`;
}
