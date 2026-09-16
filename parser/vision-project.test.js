import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseVisionProject,
  composeVisionProject,
  normalizeVisionProjectUpload,
  selectVisionProjectManifest,
} from "./vision-project.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("parseVisionProject reads root and entry", () => {
  const manifest = parseVisionProject(`# comment
project dashspec-studio
root .
entry dashspec-studio.vision
document authoring/registry/navigation.vision
`);
  assert.equal(manifest.id, "dashspec-studio");
  assert.equal(manifest.root, ".");
  assert.equal(manifest.entry, "dashspec-studio.vision");
  assert.deepEqual(manifest.documents, ["authoring/registry/navigation.vision"]);
});

test("parseVisionProject requires entry", () => {
  assert.throws(() => parseVisionProject("project x\n"), /V-P001/);
});

test("composeVisionProject matches composeVisionFile for dashspec-studio", async () => {
  const examples = path.join(__dirname, "..", "examples");
  const fromProject = await composeVisionProject(path.join(examples, "dashspec-studio.visionproj"));
  assert.equal(fromProject.id, "dashspec-studio");
  assert.equal(fromProject.screens.length, 3);
  assert.ok(fromProject.componentRegistry?.rows?.some((r) => r.id === "spec-tree"));
});

test("selectVisionProjectManifest prefers shallowest", () => {
  const picked = selectVisionProjectManifest([
    "nested/pkg/other.visionproj",
    "dashspec-studio.visionproj",
  ]);
  assert.equal(picked, "dashspec-studio.visionproj");
});

test("normalizeVisionProjectUpload strips upload prefix", () => {
  const manifest = { root: ".", entry: "dashspec-studio.vision" };
  const uploaded = {
    "examples/dashspec-studio.vision": "vision x",
    "examples/authoring/registry/navigation.vision": "components",
  };
  const { entryRel, files } = normalizeVisionProjectUpload(
    "examples/dashspec-studio.visionproj",
    manifest,
    uploaded,
  );
  assert.equal(entryRel, "dashspec-studio.vision");
  assert.equal(files["dashspec-studio.vision"], "vision x");
  assert.equal(files["authoring/registry/navigation.vision"], "components");
});
