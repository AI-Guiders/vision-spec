/** Federation presentation topology lines → screen.deck IR (alignment only). */

import { deckPresetToScreenDeck, expandDeckZoneList } from "../../parser/gdl-ir.js";

const MFD_PAGE_LINE = /^mfd-page\s*$/i;
const PRESET_LINE = /^preset\s+(\S+)\s*$/i;
const USE_DECK_LINE = /^use-deck\s+(\S+)\s*$/i;
const TOPOLOGY_LINE = /^topology\s+((?:\([^)]+\))+)\s*$/i;
const FORWARD_LINE = /^forward\s+(.+)$/i;
const MFD_LINE = /^mfd\s+(.+)$/i;
const MFD_TABS_LINE = /^mfd-tabs\s+(.+)$/i;
const SPLIT_LINE = /^split\s+(\S+)\s*$/i;
const DOCK_LINE = /^dock\s+(\S+)\s*$/i;
const EICAS_LINE = /^eicas\s+(\S+)\s*$/i;
const PFD_LINE = /^pfd\s+(.+)$/i;

/** @param {string} token */
function parseMfdTabToken(token) {
  const colon = token.indexOf(":");
  if (colon >= 0) {
    return { tab: token.slice(0, colon).trim(), zone: token.slice(colon + 1).trim() };
  }
  return { tab: token, zone: token.trim().toLowerCase().replace(/\s+/g, "-") };
}

export function parseScreenLine(screen, trimmed, doc = null) {
  let m;

  if ((m = trimmed.match(MFD_PAGE_LINE))) {
    screen.mfdPage = true;
    return true;
  }

  if ((m = trimmed.match(USE_DECK_LINE))) {
    const deck = deckPresetToScreenDeck(doc?.deck, m[1]);
    if (deck) {
      screen.deck = deck;
      return true;
    }
    ensureDeck(screen);
    screen.deck.preset = m[1];
    return true;
  }

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
    screen.deck.forward = m[1].split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    return true;
  }

  if ((m = trimmed.match(MFD_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdSlots = m[1].split("|").map((s) => s.trim()).filter(Boolean);
    return true;
  }

  if ((m = trimmed.match(MFD_TABS_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdTabBindings = m[1]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parseMfdTabToken);
    screen.deck.mfdTabs = screen.deck.mfdTabBindings.map((b) => b.tab);
    return true;
  }

  if ((m = trimmed.match(SPLIT_LINE))) {
    ensureDeck(screen);
    screen.deck.mfdSplit = m[1];
    return true;
  }

  if ((m = trimmed.match(DOCK_LINE))) {
    ensureDeck(screen);
    screen.deck.forwardDock = m[1];
    return true;
  }

  if ((m = trimmed.match(EICAS_LINE))) {
    ensureDeck(screen);
    screen.deck.eicas = m[1];
    return true;
  }

  if ((m = trimmed.match(PFD_LINE))) {
    ensureDeck(screen);
    screen.deck.pfdChips = m[1].split("|").map((s) => s.trim()).filter(Boolean);
    return true;
  }

  return false;
}

export function deckZoneIdsFromScreen(screen) {
  const deck = screen.deck;
  if (!deck) return [];
  const ids = new Set();
  for (const z of expandDeckZoneList(deck.forward)) ids.add(z);
  for (const z of expandDeckZoneList(deck.mfdSlots)) ids.add(z);
  if (deck.forwardDock) ids.add(deck.forwardDock);
  if (deck.mfdSplit) ids.add(deck.mfdSplit);
  if (deck.eicas) ids.add(deck.eicas);
  for (const binding of deck.mfdTabBindings ?? []) ids.add(binding.zone);
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
      mfdTabBindings: [],
      mfdSplit: null,
      forwardDock: null,
      eicas: null,
      pfdChips: [],
    };
  }
}
