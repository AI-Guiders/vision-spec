import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as api from "./vision-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = path.join(__dirname, "..", "examples", "dashspec-studio.visionproj");

test("vision-api re-exports composeVisionProject (ADR-0006)", async () => {
  assert.equal(typeof api.composeVisionProject, "function");
  assert.equal(typeof api.composeVisionFile, "function");
  assert.equal(typeof api.composeVision, "function");
});

test("composeVisionProject via vision-api loads dashspec-studio fixtures", async () => {
  const doc = await api.composeVisionProject(projectPath);
  assert.equal(doc.id, "dashspec-studio");
  assert.ok(doc.fixtures["spec-tree"]?.nodes?.length >= 1, "spec-tree fixture merged");
  assert.equal(doc.fixtures["layout-board"]?.type, "layout-board");
});
