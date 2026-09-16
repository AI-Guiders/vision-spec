/** Parse icon library references for presentation tables. */

/**
 * @param {string} text
 * @param {string} [defaultLibrary]
 * @returns {{ library: string, iconId: string } | null}
 */
export function parseIconRef(text, defaultLibrary = "codicons") {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const slash = raw.indexOf("/");
  if (slash >= 0) {
    return {
      library: raw.slice(0, slash).trim(),
      iconId: raw.slice(slash + 1).trim(),
    };
  }
  return { library: defaultLibrary, iconId: raw };
}

/** @param {{ library: string, iconId: string } | null | undefined} ref */
export function iconRefKey(ref) {
  if (!ref) return "";
  return `${ref.library}/${ref.iconId}`;
}
