/**
 * Vision transition graph → Graphviz IR (@viz-js/viz).
 * Cluster per screen; components nest inside; cross-screen on edges stay visible.
 */

/** @param {string} id */
export function dotNodeName(id) {
  const name = String(id).replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

function componentNodeAttributes(label) {
  return {
    label,
    shape: "box",
    style: "rounded,filled",
    fillcolor: "#1f2430",
    color: "#6b7280",
    fontcolor: "#c5cdd8",
    width: 1.55,
    height: 0.62,
    fixedsize: "true",
  };
}

/**
 * @param {ReturnType<import("./vision-graph.js").buildTransitionGraph>} transitionGraph
 * @param {{ activeScreenId?: string, overlayScreenId?: string | null }} [options]
 */
export function buildVisionDotGraph(transitionGraph, options = {}) {
  const { activeScreenId, overlayScreenId } = options;
  /** @type {Map<string, { kind: "screen" | "component", id: string, host?: string | null }>} */
  const idMap = new Map();

  const screens = transitionGraph.nodes.filter((n) => n.kind === "screen");
  const components = transitionGraph.nodes.filter((n) => n.kind === "component");
  const componentsByHost = new Map();
  for (const comp of components) {
    if (!comp.host) continue;
    if (!componentsByHost.has(comp.host)) componentsByHost.set(comp.host, []);
    componentsByHost.get(comp.host).push(comp);
  }

  const subgraphs = [];

  for (const screen of screens) {
    const clusterName = `cluster_${dotNodeName(screen.id)}`;
    idMap.set(clusterName, { kind: "screen", id: screen.id });
    const isActive = screen.id === activeScreenId || screen.id === overlayScreenId;
    const hostComponents = componentsByHost.get(screen.id) ?? [];
    const clusterNodes = [];

    for (const comp of hostComponents) {
      const nodeName = dotNodeName(comp.id);
      idMap.set(nodeName, { kind: "component", id: comp.componentId, host: comp.host });
      clusterNodes.push({
        name: nodeName,
        attributes: componentNodeAttributes(comp.label),
      });
    }

    const gateName = dotNodeName(`gate__${screen.id}`);
    idMap.set(gateName, { kind: "screen", id: screen.id });
    clusterNodes.push({
      name: gateName,
      attributes: { label: "", shape: "point", width: 0.01, height: 0.01, style: "invis" },
    });

    if (hostComponents.length === 0) {
      const anchorName = dotNodeName(`screen__${screen.id}`);
      idMap.set(anchorName, { kind: "screen", id: screen.id });
      clusterNodes.push({
        name: anchorName,
        attributes: {
          label: screen.label,
          shape: "box",
          style: "rounded,filled",
          fillcolor: isActive ? "#2a3544" : "#252932",
          color: isActive ? "#5b9bd5" : "#3d4450",
          fontcolor: "#e8eaed",
          width: 2.2,
          height: 0.7,
          fixedsize: "true",
        },
      });
    }

    subgraphs.push({
      name: clusterName,
      graphAttributes: {
        label: ` ${screen.label} `,
        rankdir: hostComponents.length > 1 ? "LR" : "TB",
        nodesep: 0.9,
        ranksep: 1.1,
        margin: 18,
        style: screen.overlay ? "rounded,dashed" : "rounded",
        color: isActive ? "#5b9bd5" : screen.overlay ? "#9aa0a6" : "#3d4450",
        penwidth: isActive ? 2 : 1.5,
        bgcolor: isActive ? "#1e2632" : "#1a1d23",
        fontcolor: "#e8eaed",
        fontsize: "13",
      },
      nodes: clusterNodes,
    });
  }

  const vizEdges = [];
  for (const edge of transitionGraph.edges) {
    if (edge.kind === "go") {
      vizEdges.push({
        tail: dotNodeName(`gate__${edge.from}`),
        head: dotNodeName(`gate__${edge.to}`),
        attributes: {
          label: edge.label,
          color: "#7aa2d6",
          fontcolor: "#c5cdd8",
          penwidth: 1.5,
          ltail: `cluster_${dotNodeName(edge.from)}`,
          lhead: `cluster_${dotNodeName(edge.to)}`,
          ...(edge.then ? { tooltip: edge.then } : {}),
        },
      });
      continue;
    }

    vizEdges.push({
      tail: dotNodeName(edge.from),
      head: dotNodeName(edge.to),
      attributes: {
        label: edge.label,
        color: "#a78bfa",
        fontcolor: "#c5cdd8",
        style: "dashed",
        penwidth: 1.5,
        ...(edge.then ? { tooltip: edge.then } : {}),
      },
    });
  }

  return {
    graph: {
      directed: true,
      graphAttributes: {
        rankdir: "LR",
        bgcolor: "transparent",
        pad: 1.2,
        nodesep: 1.1,
        ranksep: 2.4,
        splines: "true",
        compound: "true",
      },
      nodeAttributes: {
        fontname: "Segoe UI, Helvetica, Arial, sans-serif",
        fontsize: "13",
      },
      edgeAttributes: {
        fontname: "Segoe UI, Helvetica, Arial, sans-serif",
        fontsize: "11",
      },
      edges: vizEdges,
      subgraphs,
    },
    idMap,
  };
}
