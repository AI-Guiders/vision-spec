import { composeVisionFile } from "./vision-compose.js";
import { parseVision, entryScreen } from "./vision-parser.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

test("parse dashspec-studio example", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.equal(doc.id, "dashspec-studio");
  assert.equal(doc.screens.length, 2);
  assert.equal(doc.screens.find((s) => s.id === "command-palette")?.overlay, true);
  assert.ok(doc.plugins.includes("aiguiders-mental-model"));
  assert.equal(doc.screens[0].deck?.preset, "report-author");
  assert.equal(doc.fixtures["spec-tree"].type, "tree");
  assert.ok(doc.fixtures["spec-tree"].nodes.length >= 1);
  assert.ok(doc.componentRegistry?.rows?.some((r) => r.id === "spec-tree"));
  assert.ok(doc.presentations["spec-tree"]?.kinds?.length >= 3);
  assert.ok(doc.transitions.some((t) => t.when === "Ctrl+Q"));
  assert.ok(!doc.transitions.some((t) => t.when === "F12"));
});

test("entry screen is non-overlay Forward deck", async () => {
  const doc = await composeVisionFile(examplePath);
  assert.equal(entryScreen(doc).id, "studio");
});

test("minimal example", async () => {
  const minimal = fs.readFileSync(
    path.join(__dirname, "..", "examples", "minimal.vision"),
    "utf8",
  );
  const doc = await parseVision(minimal);
  assert.equal(doc.screens.length, 2);
  assert.equal(doc.screens[0].components[0].kind, "panel");
});
