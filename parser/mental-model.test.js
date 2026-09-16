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

test("mental-model plugin parses federation cockpit deck lines", async () => {
  const doc = await parseVision(example);
  const studio = doc.screens.find((s) => s.id === "studio");
  const mfd = doc.screens.find((s) => s.id === "studio-mfd");
  assert.ok(studio?.deck);
  assert.equal(studio.deck.preset, "report-author");
  assert.equal(studio.deck.topology, "(MFD)(F)");
  assert.deepEqual(studio.deck.forward, ["editor"]);
  assert.deepEqual(studio.deck.mfdSlots, ["spec-tree"]);
  assert.equal(studio.deck.eicas, "resolve");
  assert.equal(studio.mfdPage, undefined);
  assert.equal(mfd?.mfdPage, true);
  assert.deepEqual(mfd?.deck?.mfdTabs, ["Project", "SQL", "Pad", "Preview"]);
  assert.equal(mfd?.deck?.mfdSplit, "data-lab");
});

test("deck zone ids include MFD tab zones on studio-mfd screen", async () => {
  const doc = await parseVision(example);
  const mfdScreen = doc.screens.find((s) => s.id === "studio-mfd");
  const plugins = resolvePlugins(doc);
  const zones = deckZoneIds(mfdScreen, plugins);
  assert.ok(zones.has("spec-tree"));
  assert.ok(zones.has("report-preview"));
  assert.ok(zones.has("data-lab"));
  assert.ok(zones.has("resolve"));
  assert.ok(zones.has("script-pad"));
});

test("pad block lives on studio-mfd screen", async () => {
  const doc = await parseVision(example);
  const mfdScreen = doc.screens.find((s) => s.id === "studio-mfd");
  const pad = mfdScreen.blocks.find((b) => b.kind === "pad");
  assert.equal(pad?.id, "script-pad");
  assert.ok(doc.fixtures["script-pad"]?.length >= 2);
});

test("data-lab repl uses three-pane SQL Browser sketch", async () => {
  const doc = await parseVision(example);
  assert.ok(doc.fixtures["data-lab"]?.length >= 3);
});

test("F12 transitions between Forward and MFD screens", async () => {
  const doc = await parseVision(example);
  assert.ok(doc.transitions.some((t) => t.from === "studio" && t.to === "studio-mfd" && t.when === "F12"));
});
