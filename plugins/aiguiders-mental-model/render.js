/**
 * Mental-model renderer: attention bands + zone slots only.
 * Components, tab bindings, band classes, and PFD chips come from VisionDocument IR.
 * Terminology from ./terminology.js.
 */

import {
  applyDeckStyle,
  deckBandAutoStyle,
  deckPrimaryBandStyle,
  deckScreenShellStyle,
  forwardBodyStyle,
  forwardStackGridStyle,
  mfdMainStyle,
  mfdRowStyle,
  mfdTabPanelStyle,
  mfdTabPanelsStyle,
  zonePlacementStyle,
} from "./deck-layout.js";
import { MENTAL_MODEL_TERMS } from "./terminology.js";

function mfdTabBindings(deck) {
  if (deck?.mfdTabBindings?.length) return deck.mfdTabBindings;
  return (deck?.mfdTabs ?? ["Project"]).map((tab) => ({ tab, zone: tab.toLowerCase() }));
}

export function renderDeckScreen(screen, helpers) {
  const deck = screen.deck;
  if (!deck) return null;

  const { renderZone, labelForZone, deckBandForZone } = helpers;
  const bandFor = (zoneId, fallback) => deckBandForZone?.(zoneId) ?? fallback;

  const root = document.createElement("div");
  root.className = "deck-screen" + (screen.mfdPage ? " deck-screen-mfd" : " deck-screen-forward");
  root.dataset.preset = deck.preset ?? "";
  root.dataset.topology = deck.topology ?? "";
  applyDeckStyle(root, deckScreenShellStyle());

  const cockpit = renderCockpit(deck);
  applyDeckStyle(cockpit, deckBandAutoStyle());
  root.appendChild(cockpit);

  if (screen.mfdPage) {
    root.appendChild(renderMfdBand(deck, helpers));
  } else {
    root.appendChild(renderForwardBand(deck, helpers));
  }

  if (deck.eicas) {
    const eicas = document.createElement("div");
    eicas.className = "deck-eicas deck-eicas-quiet";
    applyDeckStyle(eicas, deckBandAutoStyle());
    eicas.appendChild(wrapZone(deck.eicas, "eicas", renderZone, labelForZone, bandFor(deck.eicas, "eicas")));
    root.appendChild(eicas);
  }

  return root;
}

function renderForwardBand(deck, helpers) {
  const { renderZone, labelForZone, deckBandForZone, zonePlacementHint } = helpers;
  const bandFor = (zoneId, fallback) => deckBandForZone?.(zoneId) ?? fallback;

  const forward = document.createElement("div");
  forward.className = "deck-forward deck-forward-primary";
  applyDeckStyle(forward, deckPrimaryBandStyle());
  forward.appendChild(bandLabel(MENTAL_MODEL_TERMS.forwardBand));

  const stack = document.createElement("div");
  stack.className = "deck-forward-stack";
  applyDeckStyle(stack, forwardStackGridStyle(deck));

  const forwardBody = document.createElement("div");
  forwardBody.className = "deck-forward-body";
  applyDeckStyle(forwardBody, forwardBodyStyle(deck, zonePlacementHint));
  for (const zoneId of deck.forward ?? ["editor"]) {
    forwardBody.appendChild(
      wrapZone(zoneId, bandFor(zoneId, "forward"), renderZone, labelForZone, bandFor(zoneId, "forward")),
    );
  }
  stack.appendChild(forwardBody);

  if (deck.forwardDock) {
    stack.appendChild(
      wrapZone(deck.forwardDock, "forward-dock", renderZone, labelForZone, bandFor(deck.forwardDock, "forward-dock")),
    );
  }

  forward.appendChild(stack);
  const hint = renderNavHint(MENTAL_MODEL_TERMS.navForwardToMfd);
  applyDeckStyle(hint, deckBandAutoStyle());
  forward.appendChild(hint);
  return forward;
}

function renderMfdBand(deck, helpers) {
  const { renderZone, labelForZone, deckBandForZone } = helpers;
  const bandFor = (zoneId, fallback) => deckBandForZone?.(zoneId) ?? fallback;
  const bindings = mfdTabBindings(deck);

  const mfd = document.createElement("div");
  mfd.className = "deck-mfd deck-mfd-page";
  applyDeckStyle(mfd, deckPrimaryBandStyle());
  mfd.appendChild(bandLabel(MENTAL_MODEL_TERMS.mfdBand));
  const nav = renderNavHint(MENTAL_MODEL_TERMS.navMfdToForward);
  applyDeckStyle(nav, deckBandAutoStyle());
  mfd.appendChild(nav);

  const tabBar = document.createElement("div");
  tabBar.className = "deck-mfd-tabs";
  applyDeckStyle(tabBar, deckBandAutoStyle());
  const tabPanels = document.createElement("div");
  tabPanels.className = "deck-mfd-tab-panels";
  applyDeckStyle(tabPanels, mfdTabPanelsStyle());

  let activeTab = bindings[0]?.tab;

  for (const { tab, zone } of bindings) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-mfd-tab";
    btn.textContent = tab;
    btn.dataset.tabId = tab;

    const panel = document.createElement("div");
    panel.className = "deck-mfd-tab-panel";
    panel.dataset.tabId = tab;
    panel.hidden = tab !== activeTab;
    applyDeckStyle(panel, mfdTabPanelStyle());
    panel.appendChild(wrapZone(zone, "mfd-tab-fill", renderZone, labelForZone, bandFor(zone, "mfd-tab-fill")));

    btn.addEventListener("click", () => {
      activeTab = tab;
      tabBar.querySelectorAll(".deck-mfd-tab").forEach((el) => {
        el.classList.toggle("active", el.dataset.tabId === tab);
      });
      tabPanels.querySelectorAll(".deck-mfd-tab-panel").forEach((el) => {
        el.hidden = el.dataset.tabId !== tab;
      });
    });
    if (tab === activeTab) btn.classList.add("active");

    tabBar.appendChild(btn);
    tabPanels.appendChild(panel);
  }

  mfd.appendChild(tabBar);

  const mfdRow = document.createElement("div");
  mfdRow.className = "deck-mfd-row";
  applyDeckStyle(mfdRow, mfdRowStyle(deck, bindings));
  const main = document.createElement("div");
  main.className = "deck-mfd-main";
  applyDeckStyle(main, mfdMainStyle());
  main.appendChild(tabPanels);
  mfdRow.appendChild(main);

  if (deck.mfdSplit && !bindings.some((b) => b.zone === deck.mfdSplit)) {
    mfdRow.appendChild(
      wrapZone(deck.mfdSplit, "mfd-split", renderZone, labelForZone, bandFor(deck.mfdSplit, "mfd-split")),
    );
  }

  mfd.appendChild(mfdRow);
  return mfd;
}

function renderNavHint(text) {
  const hint = document.createElement("div");
  hint.className = "deck-nav-hint muted";
  hint.textContent = text;
  return hint;
}

function renderCockpit(deck) {
  const cockpit = document.createElement("div");
  cockpit.className = "deck-cockpit";

  const pfd = document.createElement("div");
  pfd.className = "deck-pfd";
  for (const chip of deck.pfdChips ?? []) {
    const span = document.createElement("span");
    span.className = "deck-pfd-chip";
    span.textContent = chip;
    pfd.appendChild(span);
  }
  const meta = document.createElement("span");
  meta.className = "deck-pfd-meta";
  meta.textContent = (deck.preset ?? "preset") + " · " + (deck.topology ?? "topology");
  pfd.appendChild(meta);
  cockpit.appendChild(pfd);

  return cockpit;
}

function bandLabel(text) {
  const el = document.createElement("div");
  el.className = "deck-band-label";
  el.textContent = text;
  applyDeckStyle(el, deckBandAutoStyle());
  return el;
}

function wrapZone(zoneId, bandClass, renderZone, labelForZone, bandClassForStyle) {
  const wrap = document.createElement("div");
  wrap.className = "deck-zone " + bandClass;
  wrap.dataset.zoneId = zoneId;
  applyDeckStyle(wrap, zonePlacementStyle(bandClassForStyle ?? bandClass));

  const cap = document.createElement("div");
  cap.className = "deck-zone-cap";
  cap.textContent = labelForZone(zoneId);
  wrap.appendChild(cap);

  const body = document.createElement("div");
  body.className = "deck-zone-body";
  const content = renderZone(zoneId);
  if (content) body.appendChild(content);
  else {
    const miss = document.createElement("span");
    miss.className = "muted";
    miss.textContent = zoneId;
    body.appendChild(miss);
  }
  wrap.appendChild(body);

  return wrap;
}