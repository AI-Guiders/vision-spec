import { composeVisionFile } from "./vision-compose.js";
import { deckZoneIds, resolvePlugins } from "./plugins.js";
import { fixtureKeylines } from "./fixture-parse.js";
import { isMultiHostTopology } from "../plugins/aiguiders-mental-model/topology.js";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

test("mental-model plugin parses federation cockpit deck lines", async () => {
  const doc = await composeVisionFile(examplePath);
  const studio = doc.screens.find((s) => s.id === "studio");
  assert.ok(studio?.deck);
  assert.equal(studio.deck.preset, "report-author");
  assert.equal(studio.deck.topology, "(MFD)(F)");
  assert.ok(isMultiHostTopology(studio.deck.topology), "(MFD)(F) is MultiHost, not OneOf (F/M)");
  assert.deepEqual(studio.deck.forward, ["ccl", "editor"]);
  assert.deepEqual(studio.deck.mfdSlots, ["spec-tree"]);
  assert.equal(studio.deck.eicas, "resolve");
  assert.equal(studio.mfdPage, undefined);
  assert.equal(studio.deck.forwardDock, "data-lab");
  assert.deepEqual(studio.deck.pfdChips, ["demo-soak", "main"]);
  assert.deepEqual(studio.deck.mfdTabs, ["Project", "Sources", "Pad", "Preview", "Layout"]);
  assert.deepEqual(studio.deck.mfdTabBindings?.map((b) => b.zone), [
    "spec-tree",
    "environment-readiness",
    "script-pad",
    "report-preview",
    "layout-board",
  ]);
});

test("deck zone ids include MFD tab zones on studio screen", async () => {
  const doc = await composeVisionFile(examplePath);
  const studio = doc.screens.find((s) => s.id === "studio");
  const plugins = resolvePlugins(doc);
  const zones = deckZoneIds(studio, plugins);
  assert.ok(zones.has("spec-tree"));
  assert.ok(zones.has("report-preview"));
  assert.ok(zones.has("environment-readiness"));
  assert.ok(zones.has("data-lab"), "SQL dock on Forward band of studio screen");
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

test("pad component lives on studio screen MFD band", async () => {
  const doc = await composeVisionFile(examplePath);
  const studio = doc.screens.find((s) => s.id === "studio");
  const pad = studio.components.find((c) => c.kind === "pad");
  assert.equal(pad?.id, "script-pad");
  assert.ok(fixtureKeylines(doc.fixtures["script-pad"]).length >= 2);
});

test("environment-readiness is separate MFD fixture from data-lab", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.ok(fixtureKeylines(doc.fixtures["environment-readiness"]).length >= 2);
  assert.ok(fixtureKeylines(doc.fixtures["data-lab"]).some((l) => /repl/i.test(l)));
  assert.ok(!fixtureKeylines(doc.fixtures["data-lab"]).some((l) => /^connector\b/i.test(l)));
});

test("dual-host topology has no F12 screen swap transitions", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.ok(!doc.screens.some((s) => s.id === "studio-mfd"));
  assert.ok(!doc.transitions.some((t) => t.when === "F12"));
});
