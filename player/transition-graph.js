import { Network } from "../node_modules/vis-network/standalone/esm/vis-network.min.js";
import { DataSet } from "../node_modules/vis-data/standalone/esm/vis-data.min.js";
import { buildTransitionGraph } from "../parser/vision-graph.js";

/**
 * Screen transition graph via vis-network (layout, edge labels, pan/zoom).
 */
export function renderTransitionGraph(doc, { activeScreenId, overlayScreenId, onSelectScreen }) {
  const graph = buildTransitionGraph(doc);
  const wrap = document.createElement("div");
  wrap.className = "graph-view";

  const canvas = document.createElement("div");
  canvas.className = "graph-canvas";
  wrap.appendChild(canvas);

  const parallel = bucketParallelEdges(graph.edges);
  const nodes = new DataSet(
    graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      level: node.overlay ? 0 : 1,
      ...nodeStyle(node, activeScreenId, overlayScreenId),
    })),
  );

  const edges = new DataSet(
    graph.edges.map((edge) => {
      const group = parallel.get(parallelKey(edge)) ?? [edge];
      const index = group.indexOf(edge);
      const lane = group.length === 1 ? 0.25 : 0.12 + (index / Math.max(1, group.length - 1)) * 0.55;
      return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edgeDisplayLabel(edge),
        title: edgeTitle(edge),
        ...edgeStyle(edge, index, lane),
      };
    }),
  );

  const network = new Network(canvas, { nodes, edges }, networkOptions());
  network.on("click", (params) => {
    if (params.nodes.length === 1) onSelectScreen?.(params.nodes[0]);
  });

  wrap.destroyGraph = () => network.destroy();

  const legend = document.createElement("div");
  legend.className = "graph-legend";
  legend.innerHTML = `
    <span><i class="swatch go"></i> go when …</span>
    <span><i class="swatch on"></i> on block …</span>
    <span class="muted">Click node → sketch · scroll to zoom</span>`;
  wrap.appendChild(legend);

  return wrap;
}

function networkOptions() {
  return {
    autoResize: true,
    layout: {
      hierarchical: {
        enabled: true,
        direction: "UD",
        sortMethod: "directed",
        levelSeparation: 96,
        nodeSpacing: 150,
        treeSpacing: 180,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
      },
    },
    physics: { enabled: false },
    nodes: {
      shape: "box",
      margin: 6,
      font: {
        size: 11,
        color: "#e8eaed",
        face: "Segoe UI, system-ui, sans-serif",
      },
      borderWidth: 1.5,
      widthConstraint: { maximum: 120, minimum: 52 },
      shapeProperties: { borderRadius: 5 },
    },
    edges: {
      width: 1.5,
      font: {
        size: 10,
        color: "#c5cdd8",
        strokeWidth: 4,
        strokeColor: "#1a1d23",
        align: "horizontal",
      },
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true,
      tooltipDelay: 120,
    },
  };
}

function nodeStyle(node, activeScreenId, overlayScreenId) {
  const active = node.id === activeScreenId || node.id === overlayScreenId;
  const style = {
    color: {
      background: active ? "#2a3544" : "#252932",
      border: active ? "#5b9bd5" : "#3d4450",
      highlight: { background: "#2a3544", border: "#5b9bd5" },
      hover: { background: "#2f3848", border: "#5b9bd5" },
    },
  };

  if (node.overlay) {
    style.shapeProperties = { borderDashes: [5, 4], borderRadius: 5 };
  }

  return style;
}

function edgeStyle(edge, index, roundness) {
  const isOn = edge.kind === "on";
  const curve = index % 2 === 0 ? "curvedCW" : "curvedCCW";

  return {
    color: {
      color: isOn ? "#a78bfa" : "#7aa2d6",
      highlight: isOn ? "#c4b5fd" : "#9ec5ef",
      hover: isOn ? "#c4b5fd" : "#9ec5ef",
    },
    dashes: isOn ? [6, 4] : false,
    smooth: edge.from === edge.to
      ? { enabled: true, type: "curvedCW", roundness: 0.35 }
      : { enabled: true, type: curve, roundness },
  };
}

function parallelKey(edge) {
  if (edge.from === edge.to) return `self:${edge.from}:${edge.kind}:${edge.id}`;
  return `${edge.from}:${edge.to}:${edge.kind}`;
}

function bucketParallelEdges(edges) {
  const map = new Map();
  for (const edge of edges) {
    const key = parallelKey(edge);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(edge);
  }
  for (const group of map.values()) {
    group.sort((a, b) => edgeDisplayLabel(a).localeCompare(edgeDisplayLabel(b)));
  }
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
