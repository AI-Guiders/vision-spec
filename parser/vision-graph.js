/**
 * Build screen transition graph IR for Voyager-style view.
 */

export function layoutSlotIds(screen) {
  const ids = new Set();
  for (const block of screen.blocks) {
    if (block.kind === "row" || block.kind === "col") {
      for (const slot of block.slots) ids.add(slot);
    }
  }
  return ids;
}

/** Blocks rendered only inside row/col slots — skip at screen root. */
export function isLayoutBoundBlock(block, screen) {
  if (!block.id) return false;
  const slots = layoutSlotIds(screen);
  if (!slots.has(block.id)) return false;
  return ["tree", "tabs", "preview", "panel"].includes(block.kind);
}

export function screenForBlock(doc, blockId) {
  return doc.screens.find((s) => s.blocks.some((b) => b.id === blockId)) ?? null;
}

export function buildTransitionGraph(doc) {
  const nodes = doc.screens.map((s) => ({
    id: s.id,
    overlay: s.overlay,
    label: s.id,
  }));

  const edges = [];

  for (const t of doc.transitions) {
    edges.push({
      id: `go:${t.from}:${t.to}:${t.when}`,
      from: t.from,
      to: t.to,
      label: t.when,
      kind: "go",
      then: t.then,
    });
  }

  for (const h of doc.handlers) {
    const host = screenForBlock(doc, h.block);
    const from = host?.id ?? h.to;
    edges.push({
      id: `on:${h.block}:${h.event}:${h.to}`,
      from,
      to: h.to,
      label: `on ${h.block} ${h.event} ${h.target}`,
      kind: "on",
      block: h.block,
      event: h.event,
      then: h.then,
    });
  }

  return { nodes, edges, entry: doc.screens.find((s) => !s.overlay)?.id ?? doc.screens[0]?.id };
}
