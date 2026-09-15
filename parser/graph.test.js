import { parseVision } from "./vision-parser.js";
import { blockNodeId, buildTransitionGraph, isLayoutBoundBlock } from "./vision-graph.js";
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

test("layout-bound blocks are not duplicated at screen root", () => {
  const doc = parseVision(example);
  const studio = doc.screens.find((s) => s.id === "studio");
  assert.ok(studio);
  assert.equal(
    isLayoutBoundBlock(studio.blocks.find((b) => b.kind === "tree"), studio, doc),
    true,
  );
  assert.equal(
    isLayoutBoundBlock(studio.blocks.find((b) => b.id === "resolve"), studio, doc),
    true,
  );
  assert.equal(
    isLayoutBoundBlock(studio.blocks.find((b) => b.id === "editor"), studio, doc),
    true,
  );
});

test("on handler resolves block target inside screen", () => {
  const doc = parseVision(example);
  const h = doc.handlers.find((x) => x.block === "spec-tree");
  assert.ok(h);
  assert.equal(h.toBlock, "editor");
  assert.equal(h.toScreen, "studio");
});

test("transition graph links blocks for on handlers", () => {
  const doc = parseVision(example);
  const graph = buildTransitionGraph(doc);
  assert.ok(graph.edges.some((e) => e.kind === "go" && e.label === "Ctrl+K"));
  assert.ok(
    graph.edges.some(
      (e) =>
        e.kind === "on" &&
        e.from === blockNodeId("spec-tree") &&
        e.to === blockNodeId("editor"),
    ),
  );
  assert.ok(graph.nodes.some((n) => n.kind === "block" && n.blockId === "spec-tree"));
  assert.ok(graph.nodes.some((n) => n.kind === "screen" && n.label.includes("report-author")));
});
