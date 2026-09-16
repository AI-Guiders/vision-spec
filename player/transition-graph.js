import { instance } from "../node_modules/@viz-js/viz/dist/viz.js";
import { buildTransitionGraph } from "../parser/vision-graph.js";
import { buildVisionDotGraph } from "../parser/vision-dot.js";
import { GraphViewport } from "./graph-viewport.js";

let vizPromise = null;

function getViz() {
  if (!vizPromise) vizPromise = instance();
  return vizPromise;
}

/** Screen + block graph via Graphviz (@viz-js/viz) + svg-pan-zoom. */
export function renderTransitionGraph(doc, { activeScreenId, overlayScreenId, onSelectScreen }) {
  const transitionGraph = buildTransitionGraph(doc);
  const wrap = document.createElement("div");
  wrap.className = "graph-view";

  const canvas = document.createElement("div");
  canvas.className = "graph-canvas";
  canvas.innerHTML = `<div class="graph-loading muted">Rendering graph…</div>`;
  wrap.appendChild(canvas);

  wrap.initGraph = async () => {
    if (wrap._viewport) return;

    try {
      const viz = await getViz();
      const { graph, idMap } = buildVisionDotGraph(transitionGraph, {
        activeScreenId,
        overlayScreenId,
      });
      const svg = viz.renderSVGElement(graph, { engine: "dot" });
      wrap._viewport = new GraphViewport(svg, canvas, {
        idMap,
        onSelectScreen,
      });
    } catch (err) {
      canvas.classList.add("graph-canvas-error");
      canvas.textContent = `Graph error: ${err instanceof Error ? err.message : String(err)}`;
      wrap.destroyGraph = () => {};
    }
  };

  wrap.destroyGraph = () => {
    wrap._viewport?.destroy();
    wrap._viewport = null;
  };

  const legend = document.createElement("div");
  legend.className = "graph-legend";
  legend.innerHTML = `
    <span><i class="swatch go"></i> go when … (screens)</span>
    <span><i class="swatch on"></i> on … (blocks, nested in screen)</span>
    <span class="muted">Click node → sketch · scroll to zoom</span>`;
  wrap.appendChild(legend);

  return wrap;
}
