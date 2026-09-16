import { composeVisionFile } from "./vision-compose.js";
import { entryScreen } from "./vision-parser.js";
import { componentNodeId, buildTransitionGraph, isLayoutBoundComponent } from "./vision-graph.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

async function loadExample() {
  return composeVisionFile(examplePath);
}

test("layout-bound components are not duplicated at screen root", async () => {
  const doc = await loadExample();
  const studio = doc.screens.find((s) => s.id === "studio");
  const mfd = doc.screens.find((s) => s.id === "studio-mfd");
  assert.ok(studio);
  assert.ok(mfd);
  assert.equal(
    isLayoutBoundComponent(mfd.components.find((c) => c.kind === "tree"), mfd, doc),
    true,
  );
  assert.equal(
    isLayoutBoundComponent(mfd.components.find((c) => c.id === "script-pad"), mfd, doc),
    true,
  );
  assert.equal(
    isLayoutBoundComponent(studio.components.find((c) => c.id === "editor"), studio, doc),
    true,
  );
});

test("on handler resolves cross-screen component target", async () => {
  const doc = await loadExample();
  const h = doc.handlers.find((x) => x.component === "spec-tree");
  assert.ok(h);
  assert.equal(h.toComponent, "editor");
  assert.equal(h.toScreen, "studio");
});

test("transition graph links components for on handlers", async () => {
  const doc = await loadExample();
  const graph = buildTransitionGraph(doc);
  assert.ok(graph.edges.some((e) => e.kind === "go" && e.label === "Ctrl+K"));
  assert.ok(
    graph.edges.some(
      (e) =>
        e.kind === "on" &&
        e.from === componentNodeId("spec-tree") &&
        e.to === componentNodeId("editor"),
    ),
  );
  assert.ok(graph.nodes.some((n) => n.kind === "component" && n.componentId === "spec-tree"));
  assert.ok(graph.nodes.some((n) => n.kind === "screen" && n.label.includes("report-author")));
});
