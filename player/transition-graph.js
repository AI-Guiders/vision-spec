import { buildTransitionGraph } from "../parser/vision-graph.js";

const NODE_W = 96;
const NODE_H = 32;
const LANE = 26;

/**
 * Voyager-style screen graph — compact nodes, fanned edges, readable labels.
 */
export function renderTransitionGraph(doc, { activeScreenId, overlayScreenId, onSelectScreen }) {
  const graph = buildTransitionGraph(doc);
  const wrap = document.createElement("div");
  wrap.className = "graph-view";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "graph-svg");
  wrap.appendChild(svg);

  const positions = layoutNodes(graph.nodes);
  const edgeGroups = groupEdges(graph.edges);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 z" fill="#7aa2d6"/>
    </marker>
    <marker id="arrow-on" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 z" fill="#a78bfa"/>
    </marker>`;
  svg.appendChild(defs);

  const labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  labelsLayer.setAttribute("class", "graph-labels");

  for (const edge of graph.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;

    const group = edgeGroups.get(edgeKey(edge)) ?? [edge];
    const laneIndex = group.indexOf(edge);
    const laneCount = group.length;
    const lane = laneIndex - (laneCount - 1) / 2;
    const self = edge.from === edge.to;

    const geom = edgeGeometry(from, to, lane, self);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", geom.d);
    path.setAttribute("class", `graph-edge graph-edge-${edge.kind}`);
    path.setAttribute("marker-end", edge.kind === "on" ? "url(#arrow-on)" : "url(#arrow)");
    path.setAttribute("title", edgeTitle(edge));
    svg.appendChild(path);

    appendEdgeLabel(labelsLayer, geom.labelX, geom.labelY, edgeDisplayLabel(edge), edge.kind);
  }

  svg.appendChild(labelsLayer);

  for (const node of graph.nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "graph-node");
    g.dataset.screenId = node.id;

    if (node.id === activeScreenId || node.id === overlayScreenId) g.classList.add("active");
    if (node.overlay) g.classList.add("overlay");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", pos.x - NODE_W / 2);
    rect.setAttribute("y", pos.y - NODE_H / 2);
    rect.setAttribute("width", NODE_W);
    rect.setAttribute("height", NODE_H);
    rect.setAttribute("rx", "6");
    g.appendChild(rect);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.setAttribute("x", pos.x);
    title.setAttribute("y", pos.y + 1);
    title.setAttribute("class", "graph-node-title");
    title.textContent = node.label;
    g.appendChild(title);

    if (node.overlay) {
      const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badge.setAttribute("x", pos.x + NODE_W / 2 - 6);
      badge.setAttribute("y", pos.y - NODE_H / 2 + 9);
      badge.setAttribute("class", "graph-node-badge");
      badge.textContent = "O";
      g.appendChild(badge);
    }

    g.addEventListener("click", () => onSelectScreen?.(node.id));
    svg.appendChild(g);
  }

  const bounds = graphBounds(positions, labelsLayer);
  svg.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);

  const legend = document.createElement("div");
  legend.className = "graph-legend";
  legend.innerHTML = `
    <span><i class="swatch go"></i> go when …</span>
    <span><i class="swatch on"></i> on block …</span>
    <span class="muted">Click node → sketch</span>`;
  wrap.appendChild(legend);

  return wrap;
}

function layoutNodes(nodes) {
  const map = new Map();
  const base = nodes.filter((n) => !n.overlay);
  const overlays = nodes.filter((n) => n.overlay);

  const cx = 180;
  base.forEach((n, i) => {
    map.set(n.id, { x: cx + i * 140, y: 170, w: NODE_W, h: NODE_H });
  });

  overlays.forEach((n, i) => {
    const anchor = base[i] ?? base[0];
    map.set(n.id, {
      x: anchor?.x ?? cx,
      y: 72,
      w: NODE_W,
      h: NODE_H,
    });
  });

  return map;
}

function edgeKey(edge) {
  return `${edge.from}\0${edge.to}\0${edge.kind}`;
}

function groupEdges(edges) {
  const map = new Map();
  for (const edge of edges) {
    const key = edgeKey(edge);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(edge);
  }
  return map;
}

function edgeGeometry(from, to, lane, self) {
  if (self) {
    const side = lane >= 0 ? 1 : -1;
    const r = 28 + Math.abs(lane) * 12;
    const x0 = from.x + side * (NODE_W / 2 - 6);
    const y0 = from.y;
    const d = `M ${x0} ${y0 - 2}
      C ${x0 + side * r} ${y0 - r - 8}, ${x0 + side * r} ${y0 + r + 8}, ${x0} ${y0 + 2}`;
    return {
      d,
      labelX: x0 + side * (r + 18),
      labelY: y0 - 4,
    };
  }

  const up = to.y < from.y;
  const x1 = from.x + lane * LANE;
  const x2 = to.x + lane * LANE;
  const y1 = from.y - NODE_H / 2 - 4;
  const y2 = to.y + NODE_H / 2 + 4;
  const y1Out = up ? y1 : from.y + NODE_H / 2 + 4;
  const y2In = up ? y2 : to.y - NODE_H / 2 - 4;
  const midY = (y1Out + y2In) / 2;

  const d = `M ${x1} ${y1Out} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2In}`;
  return {
    d,
    labelX: (x1 + x2) / 2 + lane * 8,
    labelY: midY - 6 + lane * 2,
  };
}

function edgeDisplayLabel(edge) {
  if (edge.kind === "go") return edge.label;
  return `${edge.block} · ${edge.event}`;
}

function edgeTitle(edge) {
  if (edge.then) return `${edge.label}\n→ ${edge.then}`;
  return edge.label;
}

function appendEdgeLabel(parent, x, y, text, kind) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "graph-edge-label-wrap");

  const estW = Math.min(120, Math.max(36, text.length * 5.2));
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x - estW / 2 - 4);
  rect.setAttribute("y", y - 9);
  rect.setAttribute("width", estW + 8);
  rect.setAttribute("height", 14);
  rect.setAttribute("rx", "3");
  rect.setAttribute("class", `graph-edge-label-bg graph-edge-label-bg-${kind}`);
  g.appendChild(rect);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", x);
  label.setAttribute("y", y);
  label.setAttribute("class", "graph-edge-label");
  label.textContent = text;
  g.appendChild(label);

  parent.appendChild(g);
}

function graphBounds(positions, labelsLayer) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of positions.values()) {
    minX = Math.min(minX, p.x - NODE_W);
    minY = Math.min(minY, p.y - NODE_H);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }

  for (const rect of labelsLayer.querySelectorAll("rect")) {
    minX = Math.min(minX, Number(rect.getAttribute("x")));
    minY = Math.min(minY, Number(rect.getAttribute("y")));
    maxX = Math.max(maxX, Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")));
    maxY = Math.max(maxY, Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")));
  }

  const pad = 24;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}
