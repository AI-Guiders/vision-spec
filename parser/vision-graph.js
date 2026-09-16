/**
 * Build screen + block transition graph IR for Voyager-style view.
 */

import { deckZoneIds, resolvePlugins } from "./plugins.js";

export function layoutSlotIds(screen, doc) {
  const ids = new Set();
  if (doc) {
    for (const z of deckZoneIds(screen, resolvePlugins(doc))) ids.add(z);
  }
  for (const block of screen.blocks) {
    if (block.kind === "row" || block.kind === "col") {
      for (const slot of block.slots) ids.add(slot);
    }
  }
  return ids;
}

/** Blocks rendered only inside layout slots — skip at screen root. */
export function isLayoutBoundBlock(block, screen, doc) {
  if (!block.id) return false;
  const slots = layoutSlotIds(screen, doc);
  if (!slots.has(block.id)) return false;
  return ["tree", "tabs", "preview", "panel", "repl", "pad"].includes(block.kind);
}

export function screenForBlock(doc, blockId) {
  return doc.screens.find((s) => s.blocks.some((b) => b.id === blockId)) ?? null;
}

export function blockNodeId(blockId) {
  return `block:${blockId}`;
}

export function resolveOnTarget(doc, sourceBlock, toToken) {
  const host = screenForBlock(doc, sourceBlock);
  if (host?.blocks.some((b) => b.id === toToken)) {
    return { toScreen: host.id, toBlock: toToken };
  }

  const crossHost = doc.screens.find((s) => s.blocks.some((b) => b.id === toToken));
  if (crossHost) {
    return { toScreen: crossHost.id, toBlock: toToken };
  }

  const screen = doc.screens.find((s) => s.id === toToken);
  if (screen) return { toScreen: toToken, toBlock: null };

  throw new Error(`Unknown on target "${toToken}" for block "${sourceBlock}"`);
}

export function buildTransitionGraph(doc) {
  const nodes = doc.screens.map((s) => ({
    id: s.id,
    kind: "screen",
    overlay: s.overlay,
    label: s.mfdPage
      ? `${s.id} · MFD`
      : s.deck?.preset
        ? `${s.id} · ${s.deck.preset}`
        : s.id,
  }));

  const blockIds = new Set();
  for (const h of doc.handlers) {
    blockIds.add(h.block);
    if (h.toBlock) blockIds.add(h.toBlock);
  }
  for (const screen of doc.screens) {
    for (const block of screen.blocks) {
      if (block.id && isLayoutBoundBlock(block, screen, doc)) blockIds.add(block.id);
    }
  }

  for (const blockId of blockIds) {
    const host = screenForBlock(doc, blockId);
    nodes.push({
      id: blockNodeId(blockId),
      kind: "block",
      blockId,
      host: host?.id ?? null,
      label: blockId,
    });
  }

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
    const from = blockNodeId(h.block);
    const to = h.toBlock ? blockNodeId(h.toBlock) : (h.toScreen ?? h.to);
    edges.push({
      id: `on:${h.block}:${h.event}:${h.target}:${to}`,
      from,
      to,
      label: `${h.event} · ${h.target}`,
      kind: "on",
      block: h.block,
      event: h.event,
      target: h.target,
      then: h.then,
    });
  }

  return { nodes, edges, entry: doc.screens.find((s) => !s.overlay)?.id ?? doc.screens[0]?.id };
}
