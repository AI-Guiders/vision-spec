import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tryParseImportLine } from "./authoring-import.js";
import { composeVisionFile } from "./vision-compose.js";
import { expandLogicalPattern } from "./vision-compose.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const conformancePath = path.join(
  __dirname,
  "..",
  "..",
  "guiders-platform",
  "docs",
  "conformance",
  "authoring",
  "project",
  "import-graph.spec.json",
);

const spec = JSON.parse(fs.readFileSync(conformancePath, "utf8"));

for (const vector of spec.vectors) {
  if (!vector.line) continue;
  test(`authoring import: ${vector.id}`, () => {
    const parsed = tryParseImportLine(vector.line);
    assert.ok(parsed);
    assert.equal(parsed.targetKind, vector.expect.targetKind);
    assert.equal(parsed.path, vector.expect.path);
    if (vector.expect.alias) assert.equal(parsed.alias, vector.expect.alias);
    if (vector.expect.legacy) assert.equal(parsed.legacy, true);
  });
}

test("glob expands component pack files", () => {
  const root = path.join(__dirname, "..", "examples");
  const paths = expandLogicalPattern(root, "authoring/components/*.vision");
  assert.ok(paths.includes("authoring/components/spec-tree.vision"));
  assert.ok(paths.includes("authoring/components/data-lab.vision"));
  assert.equal(paths.length, 3);
});

test("compose dashspec-studio leaf + imports", async () => {
  const doc = await composeVisionFile(path.join(__dirname, "..", "examples", "dashspec-studio.vision"));
  assert.equal(doc.id, "dashspec-studio");
  assert.equal(doc.screens.length, 3);
  assert.ok(doc.componentRegistry?.rows?.some((r) => r.id === "spec-tree"));
  assert.ok(doc.presentations["spec-tree"]?.kinds?.length >= 3);
  assert.ok(doc.fixtures["script-pad"]);
});
