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
    this.$svg.style.width = "100%";
    this.$svg.style.height = "100%";
    container.appendChild(this.$svg);

    for (const node of this.$svg.querySelectorAll("g.node, g.cluster")) {
      node.style.cursor = "pointer";
    }

    this.bindClick();
    requestAnimationFrame(() => requestAnimationFrame(() => this.enableZoom()));

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(container);
  }

  enableZoom() {
    if (typeof svgPanZoom !== "function") {
      throw new Error("svgPanZoom not loaded — include svg-pan-zoom.min.js in index.html");
    }
    this.zoomer = svgPanZoom(this.$svg, {
      zoomScaleSensitivity: 0.28,
      minZoom: 0.2,
      maxZoom: 8,
      fit: false,
      center: false,
      controlIconsEnabled: false,
    });
    this.fit();
  }

  fit() {
    if (!this.zoomer) return;
    this.zoomer.resize();
    this.zoomer.fit();
    this.zoomer.center();

    const sizes = this.zoomer.getSizes();
    const boxW = sizes.viewBox.width * sizes.realZoom;
    const boxH = sizes.viewBox.height * sizes.realZoom;
    if (boxW <= 0 || boxH <= 0) return;

    const targetW = sizes.width * 0.9;
    const targetH = sizes.height * 0.86;
    const scaleUp = Math.min(targetW / boxW, targetH / boxH);
    if (scaleUp > 1.04) this.zoomer.zoomBy(scaleUp);
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
