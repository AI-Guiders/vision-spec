/** Federation presentation topology lines → screen.deck IR (alignment only). */

const PRESET_LINE = /^preset\s+(\S+)\s*$/i;
const TOPOLOGY_LINE = /^topology\s+((?:\([^)]+\))+)\s*$/i;
const FORWARD_LINE = /^forward\s+(.+)$/i;
const MFD_LINE = /^mfd\s+(.+)$/i;
const MFD_TABS_LINE = /^mfd-tabs\s+(.+)$/i;
const SPLIT_LINE = /^split\s+(\S+)\s*$/i;
const EICAS_LINE = /^eicas\s+(\S+)\s*$/i;

/** report-author tab id → zone id (STUDIO-ADR-0002 §3) */
const REPORT_AUTHOR_TAB_ZONES = {
  Layout: "layout-board",
  Pad: "script-pad",
};

export function parseScreenLine(screen, trimmed) {
  let m;

  if ((m = trimmed.match(PRESET_LINE))) {
    ensureDeck(screen);
    screen.deck.preset = m[1];
    return true;
  }

  if ((m = trimmed.match(TOPOLOGY_LINE))) {
    ensureDeck(screen);
    screen.deck.topology = m[1];
    return true;
  }

  if ((m = trimmed.match(FORWARD_LINE))) {
    ensureDeck(screen);
    screen.deck.forward = m[1].split(/\s+/).filter(Boolean);
    return true;
  }

  if ((m = trimmed.match(MFD_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdSlots = m[1].split("|").map((s) => s.trim()).filter(Boolean);
    return true;
  }

  if ((m = trimmed.match(MFD_TABS_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdTabs = m[1].split("|").map((s) => s.trim()).filter(Boolean);
    return true;
  }

  if ((m = trimmed.match(SPLIT_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdSplit = m[1];
    return true;
  }

  if ((m = trimmed.match(EICAS_LINE))) {
    ensureDeck(screen);
    screen.deck.eicas = m[1];
    return true;
  }

  return false;
}

export function deckZoneIdsFromScreen(screen) {
  const deck = screen.deck;
  if (!deck) return [];
  const ids = new Set();
  for (const z of deck.forward ?? []) ids.add(z);
  for (const z of deck.mfdSlots ?? []) ids.add(z);
  if (deck.mfdSplit) ids.add(deck.mfdSplit);
  if (deck.eicas) ids.add(deck.eicas);
  for (const tab of deck.mfdTabs ?? []) {
    const zone = REPORT_AUTHOR_TAB_ZONES[tab];
    if (zone) ids.add(zone);
  }
  return [...ids];
}

function ensureDeck(screen) {
  if (!screen.deck) {
    screen.deck = {
      preset: null,
      topology: null,
      forward: [],
      mfdSlots: [],
      mfdTabs: [],
      mfdSplit: null,
      eicas: null,
    };
  }
}
