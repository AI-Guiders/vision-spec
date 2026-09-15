import { parseVision } from "./vision-parser.js";
import { deckZoneIds, resolvePlugins } from "./plugins.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const example = fs.readFileSync(
  path.join(__dirname, "..", "examples", "dashspec-studio.vision"),
  "utf8",
);

test("mental-model plugin parses STUDIO-ADR-0002 deck lines", () => {
  const doc = parseVision(example);
  const studio = doc.screens.find((s) => s.id === "studio");
  assert.ok(studio?.deck);
  assert.equal(studio.deck.preset, "report-author");
  assert.equal(studio.deck.topology, "(MFD)(F)");
  assert.deepEqual(studio.deck.forward, ["report-preview"]);
  assert.deepEqual(studio.deck.mfdSlots, ["spec-tree", "editor"]);
  assert.equal(studio.deck.mfdSplit, "data-lab");
  assert.equal(studio.deck.eicas, "resolve");
});

test("deck zone ids come from plugin, not row/col", () => {
  const doc = parseVision(example);
  const studio = doc.screens.find((s) => s.id === "studio");
  const plugins = resolvePlugins(doc);
  const zones = deckZoneIds(studio, plugins);
  assert.ok(zones.has("spec-tree"));
  assert.ok(zones.has("editor"));
  assert.ok(zones.has("report-preview"));
  assert.ok(zones.has("data-lab"));
  assert.ok(zones.has("resolve"));
});

test("repl block is a first-class sketch primitive", () => {
  const doc = parseVision(example);
  const studio = doc.screens.find((s) => s.id === "studio");
  const repl = studio.blocks.find((b) => b.kind === "repl");
  assert.equal(repl?.id, "data-lab");
  assert.ok(doc.fixtures["data-lab"]?.length >= 2);
});
