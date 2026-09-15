import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInlineCatalog,
  parseInlineDeck,
  paletteRowsFromCatalog,
  deckPresetToScreenDeck,
} from "./gdl-inline.js";

test("parseInlineCatalog reads defaults, commands, phrases, bindings", () => {
  const body = [
    "defaults",
    "  binding.chord-root = Ctrl+K",
    "end defaults",
    "phrases table",
    "  | name     | phrase               |",
    "  | save-doc | save active document |",
    "end phrases",
    "commands table",
    "  | command  | phrase   | help                 |",
    "  | doc.save | save-doc | Save active document |",
    "end commands",
    "bindings table",
    "  | gesture | command  |",
    "  | Ctrl+S  | doc.save |",
    "end bindings",
  ];
  const catalog = parseInlineCatalog(body, "studio");
  assert.equal(catalog.defaults["binding.chord-root"], "Ctrl+K");
  assert.equal(catalog.commands.length, 1);
  assert.equal(catalog.commands[0].command, "doc.save");

  const rows = paletteRowsFromCatalog(catalog);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Save active document");
  assert.equal(rows[0].invoke, "/save active document");
  assert.equal(rows[0].hotkey, "Ctrl+S");
});

test("parseInlineDeck reads preset block", () => {
  const body = [
    "preset report-author",
    "  topology (MFD)(F)",
    "  forward report-preview",
    "  mfd spec-tree | editor",
    "  split data-lab",
    "  eicas resolve",
    "end preset",
  ];
  const deck = parseInlineDeck(body, "dashspec-studio");
  assert.equal(deck.presets.length, 1);
  const screenDeck = deckPresetToScreenDeck(deck, "report-author");
  assert.deepEqual(screenDeck?.mfdSlots, ["spec-tree", "editor"]);
  assert.equal(screenDeck?.eicas, "resolve");
});
