import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCatalogViaBridge, parseDeckViaBridge } from "./gdl-bridge.js";
import { wrapCatalogDocument, wrapDeckDocument } from "./gdl-router.js";
import { paletteRowsFromCatalog, deckPresetToScreenDeck, expandDeckZoneList } from "./gdl-ir.js";
import { composeVisionFile } from "./vision-compose.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

const catalogBody = `
defaults
  command.surfaces = palette, ccl.filter
  binding.chord-root = Ctrl+K
  grammar.keyboard.binding = keyboard-key-gesture
end defaults
phrases table
  | name     | phrase               |
  | save-doc | save active document |
end phrases
commands table
  | command  | phrase   | help                 |
  | doc.save | save-doc | Save active document |
end commands
bindings table
  | gesture | command  |
  | Ctrl+S  | doc.save |
end bindings
`.trim().split("\n");

const deckBody = `
preset report-author
  topology (MFD)(F)
  forward report-preview
  mfd spec-tree | editor
  eicas resolve
end preset
`.trim().split("\n");

test("VisionGdlBridge parses catalog via federation CatalogParser", () => {
  const catalog = parseCatalogViaBridge(wrapCatalogDocument("studio", catalogBody));
  assert.equal(catalog.id, "studio");
  assert.equal(catalog.commands.length, 1);
  assert.deepEqual(catalog.diagnostics, []);
  const rows = paletteRowsFromCatalog(catalog);
  assert.equal(rows[0].invoke, "save active document");
  assert.equal(rows[0].hotkey, "Ctrl+S");
});

test("VisionGdlBridge parses deck via federation DeckParser", () => {
  const deck = parseDeckViaBridge(wrapDeckDocument("dashspec-studio", deckBody));
  assert.equal(deck.id, "dashspec-studio");
  assert.deepEqual(deck.diagnostics, []);
  const screenDeck = deckPresetToScreenDeck(deck, "report-author");
  assert.deepEqual(screenDeck?.mfdSlots, ["spec-tree", "editor"]);
  assert.deepEqual(expandDeckZoneList(["ccl | editor"]), ["ccl", "editor"]);
});


test("deckPresetToScreenDeck splits pipe-separated forward zones from GDL bridge", () => {
  const deck = parseDeckViaBridge(wrapDeckDocument("dashspec-studio", [
    "preset report-author",
    "  topology (MFD)(F)",
    "  forward ccl | editor",
    "  mfd spec-tree",
    "  eicas resolve",
    "end preset",
  ]));
  const screenDeck = deckPresetToScreenDeck(deck, "report-author");
  assert.deepEqual(screenDeck?.forward, ["ccl", "editor"]);
});

test("parseVision routes inline GDL through federation bridge", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.ok(doc.catalog?.commands?.length >= 5);
  assert.ok(doc.deck?.presets?.some((p) => p.name === "report-author"));
});
