import { composeVisionFile } from "./vision-compose.js";
import { buildTransitionGraph } from "./vision-graph.js";
import { buildVisionDotGraph, dotNodeName } from "./vision-dot.js";
import { instance } from "@viz-js/viz";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.join(__dirname, "..", "examples", "dashspec-studio.vision");

test("dotNodeName sanitizes graph ids", () => {
  assert.equal(dotNodeName("component:spec-tree"), "component_spec_tree");
});

test("buildVisionDotGraph nests components in screen clusters", async () => {
  const doc = await composeVisionFile(examplePath);
  const transitionGraph = buildTransitionGraph(doc);
  const { graph, idMap } = buildVisionDotGraph(transitionGraph);

  assert.ok(graph.subgraphs?.length >= 2);
  const studioCluster = graph.subgraphs.find((s) => s.name === `cluster_${dotNodeName("studio")}`);
  assert.ok(studioCluster);
  assert.ok(studioCluster.nodes.some((n) => n.name === dotNodeName("component:spec-tree")));
  assert.ok(studioCluster.nodes.some((n) => n.name === dotNodeName("component:editor")));

  const onEdge = graph.edges.find(
    (e) =>
      e.tail === dotNodeName("component:spec-tree") &&
      e.head === dotNodeName("component:editor"),
  );
  assert.ok(onEdge);
  assert.equal(onEdge.attributes?.style, "dashed");

  const palette = graph.edges.find((e) => e.attributes?.label === "Ctrl+Q");
  assert.ok(palette);

  assert.equal(idMap.get(dotNodeName("component:spec-tree"))?.host, "studio");
  assert.equal(idMap.get(`cluster_${dotNodeName("studio")}`)?.id, "studio");
});

test("Graphviz renders dashspec-studio transition graph", async () => {
  const doc = await composeVisionFile(examplePath);
  const transitionGraph = buildTransitionGraph(doc);
  const { graph } = buildVisionDotGraph(transitionGraph);
  const viz = await instance();
  const svg = viz.renderString(graph, { engine: "dot", format: "svg" });
  assert.match(svg, /<svg/);
  assert.match(svg, /spec.tree|spec_tree/);
});
