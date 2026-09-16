/** Icon library registry for sketch player (VISION-ADR-0004). */

const FALLBACK_ICON = { library: "codicons", iconId: "file" };

/** @type {Map<string, { load(): void, render(el: HTMLElement, iconId: string): void }>} */
const libraries = new Map([
  [
    "codicons",
    {
      load() {
        if (document.getElementById("codicon-css")) return;
        const link = document.createElement("link");
        link.id = "codicon-css";
        link.rel = "stylesheet";
        link.href = new URL(
          "../node_modules/@vscode/codicons/dist/codicon.css",
          import.meta.url,
        ).href;
        document.head.appendChild(link);
      },
      render(el, iconId) {
        el.classList.add("codicon", `codicon-${iconId}`);
      },
    },
  ],
]);

/** @param {string | null | undefined} token */
export function colorTokenCssVar(token) {
  if (!token) return null;
  return `--${token}`;
}

/** @param {HTMLElement} el @param {{ library: string, iconId: string } | null | undefined} iconRef */
export function renderIcon(el, iconRef) {
  const ref = iconRef ?? FALLBACK_ICON;
  const lib = libraries.get(ref.library) ?? libraries.get(FALLBACK_ICON.library);
  lib?.load();
  lib?.render(el, ref.iconId ?? FALLBACK_ICON.iconId);
}

/**
 * @param {import("../parser/vision-parser.js").VisionDocument | null | undefined} doc
 * @param {string} componentId
 * @param {string} artifactKind
 */
export function lookupPresentationIcon(doc, componentId, artifactKind) {
  const pres = doc?.presentations?.[componentId];
  const row = pres?.kinds?.find((k) => k.kind === artifactKind);
  if (row?.icon) return row.icon;

  const defaultLibrary = doc?.defaults?.iconLibrary ?? "codicons";
  if (artifactKind === "folder") return { library: defaultLibrary, iconId: "folder" };
  return { ...FALLBACK_ICON };
}

/**
 * @param {import("../parser/vision-parser.js").VisionDocument | null | undefined} doc
 * @param {string} componentId
 * @param {string} artifactKind
 */
export function lookupPresentationColorToken(doc, componentId, artifactKind) {
  const pres = doc?.presentations?.[componentId];
  const row = pres?.kinds?.find((k) => k.kind === artifactKind);
  if (row?.colorToken) return row.colorToken;
  if (artifactKind === "folder") return "tree-folder";
  return null;
}

/** @param {import("../parser/vision-parser.js").VisionDocument | null | undefined} doc */
export function ensureIconLibraries(doc) {
  const specs = doc?.iconLibraries?.length
    ? doc.iconLibraries
    : [{ id: "codicons" }];
  for (const spec of specs) {
    libraries.get(spec.id)?.load?.();
  }
  libraries.get("codicons")?.load?.();
}
