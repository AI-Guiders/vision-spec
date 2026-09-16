import { composeVisionFile } from "./vision-compose.js";
import { deckZoneIds, resolvePlugins } from "./plugins.js";
import { fixtureKeylines } from "./fixture-parse.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

test("mental-model plugin parses federation cockpit deck lines", async () => {
  const doc = await composeVisionFile(examplePath);
  const studio = doc.screens.find((s) => s.id === "studio");
  const mfd = doc.screens.find((s) => s.id === "studio-mfd");
  assert.ok(studio?.deck);
  assert.equal(studio.deck.preset, "report-author");
  assert.equal(studio.deck.topology, "(MFD)(F)");
  assert.deepEqual(studio.deck.forward, ["ccl", "editor"]);
  assert.deepEqual(studio.deck.mfdSlots, ["spec-tree"]);
  assert.equal(studio.deck.eicas, "resolve");
  assert.equal(studio.mfdPage, undefined);
  assert.equal(studio.deck.forwardDock, "data-lab");
  assert.deepEqual(studio.deck.pfdChips, ["demo-soak", "main"]);
  assert.equal(mfd?.mfdPage, true);
  assert.deepEqual(mfd?.deck?.mfdTabs, ["Project", "Sources", "Pad", "Preview", "Layout"]);
  assert.deepEqual(mfd?.deck?.mfdTabBindings?.map((b) => b.zone), ["spec-tree", "environment-readiness", "script-pad", "report-preview", "layout-board"]);
  assert.equal(mfd?.deck?.mfdSplit, undefined);
});

test("deck zone ids include MFD tab zones on studio-mfd screen", async () => {
  const doc = await composeVisionFile(examplePath);
  const mfdScreen = doc.screens.find((s) => s.id === "studio-mfd");
  const plugins = resolvePlugins(doc);
  const zones = deckZoneIds(mfdScreen, plugins);
  assert.ok(zones.has("spec-tree"));
  assert.ok(zones.has("report-preview"));
  assert.ok(zones.has("environment-readiness"));
  assert.ok(!zones.has("data-lab"), "SQL dock lives on Forward screen only");
  assert.ok(zones.has("resolve"));
  assert.ok(zones.has("script-pad"));
  assert.ok(zones.has("layout-board"), "Layout tab maps to layout-board zone");
});

test("data-lab repl docks under editor on Forward screen", async () => {
  const doc = await composeVisionFile(examplePath);
  const studio = doc.screens.find((s) => s.id === "studio");
  const repl = studio.components.find((c) => c.kind === "repl");
  assert.equal(repl?.id, "data-lab");
  assert.equal(studio.deck.forwardDock, "data-lab");
});

test("pad component lives on studio-mfd screen", async () => {
  const doc = await composeVisionFile(examplePath);
  const mfdScreen = doc.screens.find((s) => s.id === "studio-mfd");
  const pad = mfdScreen.components.find((c) => c.kind === "pad");
  assert.equal(pad?.id, "script-pad");
  assert.ok(fixtureKeylines(doc.fixtures["script-pad"]).length >= 2);
});

test("environment-readiness is separate MFD fixture from data-lab", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.ok(fixtureKeylines(doc.fixtures["environment-readiness"]).length >= 2);
  assert.ok(fixtureKeylines(doc.fixtures["data-lab"]).some((l) => /repl/i.test(l)));
  assert.ok(!fixtureKeylines(doc.fixtures["data-lab"]).some((l) => /^connector\b/i.test(l)));
});

test("F12 transitions between Forward and MFD screens", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.ok(doc.transitions.some((t) => t.from === "studio" && t.to === "studio-mfd" && t.when === "F12"));
});
