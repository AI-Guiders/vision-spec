/**
 * CCL (authoring command line) — Console notation (no slash prefix).
 * Slash belongs in editor dual-role surfaces, not cockpit CCL.
 */

export function renderCclBar(container) {
  container.className = "block-body deck-ccl";
  container.replaceChildren();

  const row = document.createElement("div");
  row.className = "deck-ccl-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "deck-ccl-input";
  input.placeholder = "add card …";
  input.setAttribute("aria-label", "Command line — console notation");
  input.spellcheck = false;

  row.appendChild(input);
  container.appendChild(row);

  const hint = document.createElement("div");
  hint.className = "deck-ccl-hint";
  hint.textContent = "Console command · Enter run · Esc cancel · Tab complete";
  container.appendChild(hint);

  return input;
}
