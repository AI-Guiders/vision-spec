import { parseVision } from "./vision-parser.js";
import { buildTransitionGraph, isLayoutBoundBlock } from "./vision-graph.js";
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
  assert.equal(isLayoutBoundBlock(studio.blocks.find((b) => b.kind === "tree"), studio), true);
  assert.equal(isLayoutBoundBlock(studio.blocks.find((b) => b.id === "resolve"), studio), false);
});

test("transition graph includes go and on edges", () => {
  const doc = parseVision(example);
  const graph = buildTransitionGraph(doc);
  assert.ok(graph.edges.some((e) => e.kind === "go" && e.label === "Ctrl+K"));
  assert.ok(graph.edges.some((e) => e.kind === "on" && e.block === "project-tree"));
});
