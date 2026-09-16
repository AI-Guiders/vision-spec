import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tryParseImportLine } from "./authoring-import.js";
import {
  composeVisionFile,
  composeVisionFromMap,
  expandLogicalPattern,
  readVisionProjectMap,
} from "./vision-compose.js";
import { composeVisionProject } from "./vision-project.js";

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

test("glob expands component and registry pack files", () => {
  const root = path.join(__dirname, "..", "examples");
  const componentPaths = expandLogicalPattern(root, "authoring/components/*.vision");
  assert.ok(componentPaths.includes("authoring/components/spec-tree.vision"));
  assert.ok(componentPaths.includes("authoring/components/data-lab.vision"));
  assert.equal(componentPaths.length, 5);
  assert.ok(componentPaths.includes("authoring/components/environment-readiness.vision"));
  assert.ok(componentPaths.includes("authoring/components/layout-board.vision"));

  const registryPaths = expandLogicalPattern(root, "authoring/registry/*.vision");
  assert.ok(registryPaths.includes("authoring/registry/navigation.vision"));
  assert.ok(registryPaths.includes("authoring/registry/workspace.vision"));
  assert.equal(registryPaths.length, 2);
});

test("wire import federation/vision/icon-defaults resolves", async () => {
  const doc = await composeVisionFile(path.join(__dirname, "..", "examples", "dashspec-studio.vision"));
  assert.equal(doc.defaults?.iconLibrary, "codicons");
  assert.ok(doc.iconLibraries?.some((lib) => lib.id === "codicons"));
  const iconDiag = doc.diagnostics?.find((d) => d.code === "V-I006" && d.message.includes("icon-defaults"));
  assert.equal(iconDiag, undefined);
});

test("compose dashspec-studio leaf + imports", async () => {
  const doc = await composeVisionFile(path.join(__dirname, "..", "examples", "dashspec-studio.vision"));
  assert.equal(doc.id, "dashspec-studio");
  assert.equal(doc.screens.length, 3);
  assert.ok(doc.componentRegistry?.rows?.some((r) => r.id === "spec-tree"));
  assert.ok(doc.presentations["spec-tree"]?.kinds?.length >= 3);
  assert.ok(doc.fixtures["script-pad"]);
});

test("composeVisionFromMap matches composeVisionFile for dashspec-studio", async () => {
  const examples = path.join(__dirname, "..", "examples");
  const entry = "dashspec-studio.vision";
  const fromFile = await composeVisionFile(path.join(examples, entry));
  const files = readVisionProjectMap(examples);
  const fromMap = await composeVisionFromMap(entry, files, { projectRoot: examples });
  assert.equal(fromMap.id, fromFile.id);
  assert.equal(fromMap.screens.length, fromFile.screens.length);
  assert.deepEqual(
    fromMap.componentRegistry?.rows?.map((r) => r.id).sort(),
    fromFile.componentRegistry?.rows?.map((r) => r.id).sort(),
  );
});

test("composeVisionProject loads dashspec-studio via manifest", async () => {
  const doc = await composeVisionProject(path.join(__dirname, "..", "examples", "dashspec-studio.visionproj"));
  assert.equal(doc.id, "dashspec-studio");
  assert.equal(doc.screens.length, 3);
});
