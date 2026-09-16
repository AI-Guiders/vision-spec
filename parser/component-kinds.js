/** @typedef {"tree"|"tabs"|"preview"|"panel"|"repl"|"pad"|"search"|"command-list"} ComponentKind */

export const COMPONENT_KINDS = [
  "tree",
  "tabs",
  "preview",
  "panel",
  "repl",
  "pad",
  "search",
  "command-list",
];

/** @param {string} kind */
export function isComponentKind(kind) {
  return COMPONENT_KINDS.includes(kind);
}

/** Layout-bound component kinds (render inside deck slots). */
export const SLOT_COMPONENT_KINDS = [
  "tree",
  "tabs",
  "preview",
  "panel",
  "repl",
  "pad",
];
