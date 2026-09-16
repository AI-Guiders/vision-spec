/**
 * Deck band layout from screen.deck IR.
 * DashSpec ADR-0002 pattern: declarative spec → placement styles → host applies inline
 * (cf. DashboardLayoutHelper.CardPlacementStyle in DashSpec.Host).
 */

/** @param {Record<string, string>} style */
export function applyDeckStyle(el, style) {
  for (const [key, value] of Object.entries(style)) {
    if (value != null && value !== "") el.style[key] = value;
  }
}

export function deckScreenShellStyle() {
  return {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 0",
    minHeight: "0",
    gap: "4px",
  };
}

export function deckMultiHostShellStyle() {
  return {
    ...deckScreenShellStyle(),
    gap: "6px",
  };
}

export function deckHostsRowStyle() {
  return {
    flex: "1 1 0",
    minHeight: "0",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "8px",
    alignItems: "stretch",
  };
}

export function deckHostColumnStyle() {
  return {
    minWidth: "0",
    minHeight: "0",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    border: "1px dashed var(--border)",
    borderRadius: "8px",
    padding: "4px",
    overflow: "hidden",
  };
}

export function deckBandAutoStyle() {
  return { flex: "0 0 auto" };
}

export function deckPrimaryBandStyle() {
  return {
    flex: "1 1 0",
    minHeight: "0",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };
}

export function forwardStackGridStyle(deck) {
  const rows = ["minmax(0, 1fr)"];
  if (deck.forwardDock) rows.push("auto");
  return {
    display: "grid",
    gridTemplateRows: rows.join(" "),
    flex: "1 1 0",
    minHeight: "0",
    gap: "8px",
    overflow: "hidden",
  };
}

export function forwardBodyStyle(deck, zonePlacementHint = () => null) {
  const zones = deck.forward?.length ? deck.forward : ["editor"];
  if (zones.length <= 1) {
    return {
      minHeight: "0",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      overflow: "hidden",
    };
  }
  const autoRows = zones.map((z) => zonePlacementHint(z)?.stackRow === "auto");
  if (autoRows.some(Boolean)) {
    return {
      minHeight: "0",
      display: "grid",
      gridTemplateRows: autoRows.map((auto) => (auto ? "auto" : "minmax(0, 1fr)")).join(" "),
      gridTemplateColumns: "1fr",
      gap: "8px",
      overflow: "hidden",
    };
  }
  return {
    minHeight: "0",
    display: "grid",
    gridTemplateColumns: `repeat(${zones.length}, minmax(0, 1fr))`,
    gap: "8px",
    overflow: "hidden",
  };
}

export function mfdRowStyle(deck, tabBindings = []) {
  const tabZones = new Set(tabBindings.map((b) => b.zone));
  const hasSplit = Boolean(deck.mfdSplit && !tabZones.has(deck.mfdSplit));
  if (!hasSplit) {
    return {
      flex: "1 1 0",
      display: "flex",
      flexDirection: "column",
      minHeight: "0",
      gap: "8px",
    };
  }
  return {
    flex: "1 1 0",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    minHeight: "0",
    gap: "8px",
  };
}

export function mfdMainStyle() {
  return {
    flex: "1 1 0",
    display: "flex",
    flexDirection: "column",
    minWidth: "0",
    minHeight: "0",
  };
}

export function mfdTabPanelsStyle() {
  return {
    flex: "1 1 0",
    minHeight: "0",
    display: "flex",
    flexDirection: "column",
  };
}

export function mfdTabPanelStyle() {
  return { flex: "1 1 0", minHeight: "0" };
}

export function zonePlacementStyle(bandClass) {
  switch (bandClass) {
    case "forward-ccl":
      return { flex: "0 0 auto", minHeight: "0", minWidth: "0" };
    case "forward":
      return { flex: "1 1 0", minHeight: "0", minWidth: "0" };
    case "forward-dock":
      return { minHeight: "0", minWidth: "0" };
    case "mfd-tab-fill":
      return { flex: "1 1 0", minHeight: "0", minWidth: "0" };
    case "mfd-split":
      return { minWidth: "0", minHeight: "0" };
    case "eicas":
      return { flex: "1 1 0", minHeight: "48px" };
    default:
      return { minWidth: "0", minHeight: "0" };
  }
}
