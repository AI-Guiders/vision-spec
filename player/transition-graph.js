import { buildTransitionGraph } from "../parser/vision-graph.js";

/**
 * Simple Voyager-style screen graph (SVG, no deps).
 */
export function renderTransitionGraph(doc, { activeScreenId, overlayScreenId, onSelectScreen }) {
  const graph = buildTransitionGraph(doc);
  const wrap = document.createElement("div");
  wrap.className = "graph-view";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "graph-svg");
  wrap.appendChild(svg);

  const positions = layoutNodes(graph.nodes);
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#7aa2d6"/>
    </marker>
    <marker id="arrow-on" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa"/>
    </marker>`;
  svg.appendChild(defs);

  for (const edge of graph.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = edgePath(from, to, edge.from === edge.to);
    path.setAttribute("d", d);
    path.setAttribute("class", `graph-edge graph-edge-${edge.kind}`);
    path.setAttribute("marker-end", edge.kind === "on" ? "url(#arrow-on)" : "url(#arrow)");
    path.setAttribute("title", edge.then ? `${edge.label}\n→ ${edge.then}` : edge.label);
    svg.appendChild(path);

    const mid = edgeMid(from, to, edge.from === edge.to);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", mid.x);
    label.setAttribute("y", mid.y);
    label.setAttribute("class", "graph-edge-label");
    label.textContent = edge.label;
    svg.appendChild(label);
  }

  for (const node of graph.nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "graph-node");
    g.dataset.screenId = node.id;

    const active =
      node.id === activeScreenId ||
      node.id === overlayScreenId ||
      (node.id === overlayScreenId && overlayScreenId);
    if (active) g.classList.add("active");
    if (node.overlay) g.classList.add("overlay");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", pos.x - pos.w / 2);
    rect.setAttribute("y", pos.y - pos.h / 2);
    rect.setAttribute("width", pos.w);
    rect.setAttribute("height", pos.h);
    rect.setAttribute("rx", "10");
    svg.appendChild(g);
    g.appendChild(rect);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.setAttribute("x", pos.x);
    title.setAttribute("y", pos.y - 4);
    title.setAttribute("class", "graph-node-title");
    title.textContent = node.label;
    g.appendChild(title);

    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.setAttribute("x", pos.x);
    sub.setAttribute("y", pos.y + 14);
    sub.setAttribute("class", "graph-node-sub");
    sub.textContent = node.overlay ? "overlay" : "screen";
    g.appendChild(sub);

    g.addEventListener("click", () => onSelectScreen?.(node.id));
    svg.appendChild(g);
  }

  const bounds = graphBounds(positions);
  svg.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);

  const legend = document.createElement("div");
  legend.className = "graph-legend";
  legend.innerHTML = `
    <span><i class="swatch go"></i> go when …</span>
    <span><i class="swatch on"></i> on block …</span>
    <span class="muted">Click node → jump to screen in sketch mode</span>`;
  wrap.appendChild(legend);

  return wrap;
}

function layoutNodes(nodes) {
  const map = new Map();
  const base = nodes.filter((n) => !n.overlay);
  const overlays = nodes.filter((n) => n.overlay);

  base.forEach((n, i) => {
    map.set(n.id, { x: 160 + i * 220, y: 200, w: 150, h: 72 });
  });

  overlays.forEach((n, i) => {
    map.set(n.id, { x: 160 + i * 220, y: 70, w: 150, h: 72 });
  });

  return map;
}

function edgePath(from, to, self) {
  if (self) {
    return `M ${from.x + 40} ${from.y - from.h / 2}
            C ${from.x + 90} ${from.y - 90}, ${from.x - 90} ${from.y - 90}, ${from.x - 40} ${from.y - from.h / 2}`;
  }
  const y1 = from.y - (from.y > to.y ? 20 : -20);
  const y2 = to.y + (from.y > to.y ? to.h / 2 + 8 : -to.h / 2 - 8);
  return `M ${from.x} ${y1} C ${from.x} ${(y1 + y2) / 2}, ${to.x} ${(y1 + y2) / 2}, ${to.x} ${y2}`;
}

function edgeMid(from, to, self) {
  if (self) return { x: from.x, y: from.y - 70 };
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 10 };
}

function graphBounds(positions) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x - p.w);
    minY = Math.min(minY, p.y - p.h);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  const pad = 40;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}
