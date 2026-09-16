/**
 * Pan/zoom + click routing for Graphviz SVG (Voyager viewport pattern, MIT).
 */

/** @type {any} */
const svgPanZoom = globalThis.svgPanZoom;

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

    for (const node of this.$svg.querySelectorAll("g.node")) {
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
    let dragged = false;
    const onMove = () => {
      dragged = true;
    };

    this.$svg.addEventListener("mousedown", () => {
      dragged = false;
      this.$svg.addEventListener("mousemove", onMove, { once: true });
    });

    this.$svg.addEventListener("mouseup", (event) => {
      this.$svg.removeEventListener("mousemove", onMove);
      if (dragged) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const nodeEl = target.closest("g.node");
      if (!nodeEl?.id) return;

      const meta = this.idMap.get(nodeEl.id);
      if (!meta) return;
      const screenId = meta.kind === "block" ? meta.host : meta.id;
      if (screenId) this.onSelectScreen?.(screenId);
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.zoomer?.destroy();
    this.container.replaceChildren();
  }
}
