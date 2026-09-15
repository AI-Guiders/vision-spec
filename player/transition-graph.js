import { DataSet, Network } from "../node_modules/vis-network/standalone/esm/vis-network.min.mjs";
import { buildTransitionGraph } from "../parser/vision-graph.js";

/** Screen transition graph via vis-network (mount after DOM insert). */
export function renderTransitionGraph(doc, { activeScreenId, overlayScreenId, onSelectScreen }) {
  const graph = buildTransitionGraph(doc);
  const wrap = document.createElement("div");
  wrap.className = "graph-view";

  const canvas = document.createElement("div");
  canvas.className = "graph-canvas";
  wrap.appendChild(canvas);

  const positions = computeLayout(graph.nodes);
  const nodes = new DataSet(
    graph.nodes.map((node) => {
      const pos = positions.get(node.id) ?? { x: 0, y: 0 };
      const active = node.id === activeScreenId || node.id === overlayScreenId;
      return {
        id: node.id,
        label: node.label,
        x: pos.x,
        y: pos.y,
        fixed: true,
        shape: "box",
        font: { color: "#e8eaed", size: 12 },
        color: {
          background: active ? "#2a3544" : "#252932",
          border: active ? "#5b9bd5" : node.overlay ? "#9aa0a6" : "#3d4450",
        },
        borderWidth: node.overlay ? 1.5 : 2,
        shapeProperties: { borderRadius: 6, ...(node.overlay ? { borderDashes: [5, 4] } : {}) },
      };
    }),
  );

  const edges = new DataSet(
    graph.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edgeDisplayLabel(edge),
      title: edgeTitle(edge),
      color: edge.kind === "on" ? "#a78bfa" : "#7aa2d6",
      dashes: edge.kind === "on",
      font: { color: "#c5cdd8", size: 10, strokeWidth: 4, strokeColor: "#1a1d23" },
      arrows: "to",
    })),
  );

  wrap.initGraph = () => {
    if (wrap._network) return;

    try {
      const network = new Network(
        canvas,
        { nodes, edges },
        {
          autoResize: true,
          physics: { enabled: false },
          interaction: { hover: true, zoomView: true, dragView: true },
          edges: { smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.35 } },
        },
      );

      network.on("click", (params) => {
        if (params.nodes.length === 1) onSelectScreen?.(params.nodes[0]);
      });

      requestAnimationFrame(() => network.fit({ animation: false, padding: 56 }));

      wrap._network = network;
      wrap.destroyGraph = () => {
        network.destroy();
        wrap._network = null;
      };
    } catch (err) {
      canvas.classList.add("graph-canvas-error");
      canvas.textContent = `Graph error: ${err instanceof Error ? err.message : String(err)}`;
      wrap.destroyGraph = () => {};
    }
  };

  wrap.destroyGraph = () => {};

  const legend = document.createElement("div");
  legend.className = "graph-legend";
  legend.innerHTML = `
    <span><i class="swatch go"></i> go when …</span>
    <span><i class="swatch on"></i> on block …</span>
    <span class="muted">Click node → sketch · scroll to zoom</span>`;
  wrap.appendChild(legend);

  return wrap;
}

function computeLayout(nodes) {
  const map = new Map();
  const base = nodes.filter((n) => !n.overlay);
  const overlays = nodes.filter((n) => n.overlay);
  const gapX = 200;
  const baseY = 70;
  const overlayY = -80;
  const startX = -((Math.max(1, base.length) - 1) * gapX) / 2;

  base.forEach((n, i) => {
    map.set(n.id, { x: startX + i * gapX, y: baseY });
  });

  overlays.forEach((n, i) => {
    const anchor = base[i] ?? base[0];
    map.set(n.id, {
      x: anchor ? map.get(anchor.id)?.x ?? 0 : 0,
      y: overlayY,
    });
  });

  return map;
}

function edgeDisplayLabel(edge) {
  if (edge.kind === "go") return edge.label;
  return `${edge.block} · ${edge.event}`;
}

function edgeTitle(edge) {
  const when = edgeDisplayLabel(edge);
  if (edge.then) return `${when}\n→ ${edge.then}`;
  return when;
}
