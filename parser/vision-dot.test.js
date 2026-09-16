import { parseVision } from "./vision-parser.js";
import { buildTransitionGraph } from "./vision-graph.js";
import { buildVisionDotGraph, dotNodeName } from "./vision-dot.js";
import { instance } from "@viz-js/viz";
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

test("dotNodeName sanitizes graph ids", () => {
  assert.equal(dotNodeName("component:spec-tree"), "component_spec_tree");
});

test("buildVisionDotGraph nests components in screen clusters", async () => {
  const doc = await parseVision(example);
  const transitionGraph = buildTransitionGraph(doc);
  const { graph, idMap } = buildVisionDotGraph(transitionGraph);

  assert.ok(graph.subgraphs?.length >= 3);
  const mfdCluster = graph.subgraphs.find((s) => s.name === `cluster_${dotNodeName("studio-mfd")}`);
  const fwdCluster = graph.subgraphs.find((s) => s.name === `cluster_${dotNodeName("studio")}`);
  assert.ok(mfdCluster);
  assert.ok(fwdCluster);
  assert.ok(mfdCluster.nodes.some((n) => n.name === dotNodeName("component:spec-tree")));
  assert.ok(fwdCluster.nodes.some((n) => n.name === dotNodeName("component:editor")));

  const onEdge = graph.edges.find(
    (e) =>
      e.tail === dotNodeName("component:spec-tree") &&
      e.head === dotNodeName("component:editor"),
  );
  assert.ok(onEdge);
  assert.equal(onEdge.attributes?.style, "dashed");

  const f12 = graph.edges.find((e) => e.attributes?.label === "F12");
  assert.ok(f12);
  assert.equal(f12.attributes?.ltail, `cluster_${dotNodeName("studio")}`);
  assert.equal(f12.attributes?.lhead, `cluster_${dotNodeName("studio-mfd")}`);

  assert.equal(idMap.get(dotNodeName("component:spec-tree"))?.host, "studio-mfd");
  assert.equal(idMap.get(`cluster_${dotNodeName("studio")}`)?.id, "studio");
});

test("Graphviz renders dashspec-studio transition graph", async () => {
  const doc = await parseVision(example);
  const transitionGraph = buildTransitionGraph(doc);
  const { graph } = buildVisionDotGraph(transitionGraph);
  const viz = await instance();
  const svg = viz.renderString(graph, { engine: "dot", format: "svg" });
  assert.match(svg, /<svg/);
  assert.match(svg, /spec.tree|spec_tree/);
});
