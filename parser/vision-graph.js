/**
 * Build screen + component transition graph IR.
 */

import { deckZoneIds, resolvePlugins } from "./plugins.js";
import { SLOT_COMPONENT_KINDS } from "./component-kinds.js";

export function layoutSlotIds(screen, doc) {
  const ids = new Set();
  if (doc) {
    for (const z of deckZoneIds(screen, resolvePlugins(doc))) ids.add(z);
  }
  for (const layout of screen.layout ?? []) {
    for (const slot of layout.slots) ids.add(slot);
  }
  return ids;
}

/** Components rendered only inside layout slots — skip at screen root. */
export function isLayoutBoundComponent(comp, screen, doc) {
  if (!comp?.id) return false;
  const slots = layoutSlotIds(screen, doc);
  if (!slots.has(comp.id)) return false;
  return SLOT_COMPONENT_KINDS.includes(comp.kind);
}

/** @deprecated use isLayoutBoundComponent */
export const isLayoutBoundBlock = isLayoutBoundComponent;

export function screenForComponent(doc, componentId) {
  return (
    doc.screens.find((s) => s.components.some((c) => c.id === componentId)) ?? null
  );
}

/** @deprecated use screenForComponent */
export const screenForBlock = screenForComponent;

export function componentNodeId(componentId) {
  return `component:${componentId}`;
}

/** @deprecated use componentNodeId */
export const blockNodeId = componentNodeId;

export function resolveOnTarget(doc, sourceComponent, toToken) {
  const host = screenForComponent(doc, sourceComponent);
  if (host?.components.some((c) => c.id === toToken)) {
    return { toScreen: host.id, toComponent: toToken };
  }

  const crossHost = doc.screens.find((s) => s.components.some((c) => c.id === toToken));
  if (crossHost) {
    return { toScreen: crossHost.id, toComponent: toToken };
  }

  const screen = doc.screens.find((s) => s.id === toToken);
  if (screen) return { toScreen: toToken, toComponent: null };

  throw new Error(`Unknown on target "${toToken}" for component "${sourceComponent}"`);
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

  const componentIds = new Set();
  for (const h of doc.handlers) {
    componentIds.add(h.component);
    if (h.toComponent) componentIds.add(h.toComponent);
  }
  for (const screen of doc.screens) {
    for (const comp of screen.components) {
      if (isLayoutBoundComponent(comp, screen, doc)) componentIds.add(comp.id);
    }
  }

  for (const componentId of componentIds) {
    const host = screenForComponent(doc, componentId);
    nodes.push({
      id: componentNodeId(componentId),
      kind: "component",
      componentId,
      host: host?.id ?? null,
      label: componentId,
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
    const from = componentNodeId(h.component);
    const to = h.toComponent ? componentNodeId(h.toComponent) : (h.toScreen ?? h.to);
    edges.push({
      id: `on:${h.component}:${h.event}:${h.target}:${to}`,
      from,
      to,
      label: `${h.event} · ${h.target}`,
      kind: "on",
      component: h.component,
      event: h.event,
      target: h.target,
      then: h.then,
    });
  }

  return { nodes, edges, entry: doc.screens.find((s) => !s.overlay)?.id ?? doc.screens[0]?.id };
}
