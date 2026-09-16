/**
 * Pan/zoom + click routing for Graphviz SVG (Voyager viewport pattern, MIT).
 */

/** @type {any} */
const svgPanZoom = globalThis.svgPanZoom;

/** @param {Element} groupEl */
function lookupMeta(groupEl, idMap) {
  const title = groupEl.querySelector(":scope > title")?.textContent?.trim();
  if (!title) return null;
  return idMap.get(title) ?? null;
}

/** @param {{ kind: string, id: string, host?: string | null }} meta */
function screenIdFromMeta(meta) {
  return meta.kind === "block" ? meta.host : meta.id;
}

export class GraphViewport {
  constructor(svgElement, container, { idMap, onSelectScreen }) {
    this.container = container;
    this.idMap = idMap;
    this.onSelectScreen = onSelectScreen;
    this.zoomer = null;

    container.replaceChildren();
    this.$svg = svgElement;
    this.$svg.classList.add("vision-graph-svg");
    container.appendChild(this.$svg);

    for (const node of this.$svg.querySelectorAll("g.node, g.cluster")) {
      node.style.cursor = "pointer";
    }

    this.bindClick();
    requestAnimationFrame(() => this.enableZoom());

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(container);
  }

  enableZoom() {
    if (typeof svgPanZoom !== "function") {
      throw new Error("svgPanZoom not loaded — include svg-pan-zoom.min.js in index.html");
    }
    this.zoomer = svgPanZoom(this.$svg, {
      zoomScaleSensitivity: 0.28,
      minZoom: 0.25,
      maxZoom: 6,
      fit: true,
      center: true,
    });
    this.fit();
  }

  fit() {
    if (!this.zoomer) return;
    this.zoomer.resize();
    this.zoomer.fit();
    this.zoomer.center();
  }

  bindClick() {
    this.$svg.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const nodeEl = target.closest("g.node");
      if (nodeEl) {
        const meta = lookupMeta(nodeEl, this.idMap);
        const screenId = meta ? screenIdFromMeta(meta) : null;
        if (screenId) {
          event.preventDefault();
          this.onSelectScreen?.(screenId);
        }
        return;
      }

      const clusterEl = target.closest("g.cluster");
      if (!clusterEl) return;
      const meta = lookupMeta(clusterEl, this.idMap);
      const screenId = meta ? screenIdFromMeta(meta) : null;
      if (screenId) {
        event.preventDefault();
        this.onSelectScreen?.(screenId);
      }
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.zoomer?.destroy();
    this.container.replaceChildren();
  }
}
