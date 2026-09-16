/**
 * CCL (authoring command line) — component render (catalog surface ccl.filter).
 */

export function renderCclBar(container) {
  container.className = "block-body deck-ccl";
  container.replaceChildren();

  const row = document.createElement("div");
  row.className = "deck-ccl-input-row";

  const prefix = document.createElement("span");
  prefix.className = "deck-ccl-prefix";
  prefix.textContent = "/";
  prefix.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "deck-ccl-input";
  input.placeholder = "add card …";
  input.setAttribute("aria-label", "Command line — type / then command name");
  input.spellcheck = false;

  row.appendChild(prefix);
  row.appendChild(input);
  container.appendChild(row);

  const hint = document.createElement("div");
  hint.className = "deck-ccl-hint";
  hint.textContent = "Click here · type /command · Enter run · Esc cancel · Tab complete";
  container.appendChild(hint);

  return input;
}
