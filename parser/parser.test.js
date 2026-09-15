import { parseVision, entryScreen } from "./vision-parser.js";
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

test("parse dashspec-studio example", () => {
  const doc = parseVision(example);
  assert.equal(doc.id, "dashspec-studio");
  assert.equal(doc.screens.length, 2);
  assert.equal(doc.screens[1].overlay, true);
  assert.ok(doc.plugins.includes("aiguiders-mental-model"));
  assert.equal(doc.screens[0].deck?.preset, "report-author");
  assert.ok(doc.fixtures["spec-tree"].length >= 3);
  assert.ok(doc.transitions.some((t) => t.when === "Ctrl+K"));
});

test("entry screen is non-overlay", () => {
  const doc = parseVision(example);
  assert.equal(entryScreen(doc).id, "studio");
});

test("minimal example", () => {
  const minimal = fs.readFileSync(
    path.join(__dirname, "..", "examples", "minimal.vision"),
    "utf8",
  );
  const doc = parseVision(minimal);
  assert.equal(doc.screens.length, 2);
});
