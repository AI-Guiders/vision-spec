/**
 * Federation cockpit sketch (GUIDERS ADR-0021 / STUDIO ADR-0002):
 * PFD = orientation · Forward = primary work · MFD = secondary instruments (separate screen).
 * Band sizing from screen.deck IR inline — DashSpec ADR-0002 host placement pattern.
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

const REPORT_AUTHOR_TABS = [
  { id: "Project", label: "Project" },
  { id: "Sources", label: "Sources" },
  { id: "SQL", label: "SQL" },
  { id: "Pad", label: "Pad" },
  { id: "Preview", label: "Preview" },
  { id: "Layout", label: "Layout*", disabled: true },
];

const TAB_ZONE = {
  Project: "spec-tree",
  Sources: "environment-readiness",
  SQL: "data-lab",
  Pad: "script-pad",
  Preview: "report-preview",
  Layout: "layout-board",
};

export function renderDeckScreen(screen, { renderZone, labelForZone }) {
  const deck = screen.deck;
  if (!deck) return null;

  const root = document.createElement("div");
  root.className = "deck-screen" + (screen.mfdPage ? " deck-screen-mfd" : " deck-screen-forward");
  root.dataset.preset = deck.preset ?? "";
  root.dataset.topology = deck.topology ?? "";
  applyDeckStyle(root, deckScreenShellStyle());

  const cockpit = renderCockpit(deck);
  applyDeckStyle(cockpit, deckBandAutoStyle());
  root.appendChild(cockpit);

  if (screen.mfdPage) {
    root.appendChild(renderMfdBand(deck, renderZone, labelForZone));
  } else {
    root.appendChild(renderForwardBand(deck, renderZone, labelForZone));
  }

  if (deck.eicas) {
    const eicas = document.createElement("div");
    eicas.className = "deck-eicas deck-eicas-quiet";
    applyDeckStyle(eicas, deckBandAutoStyle());
    eicas.appendChild(wrapZone(deck.eicas, "eicas", renderZone, labelForZone));
    root.appendChild(eicas);
  }

  return root;
}

function renderForwardBand(deck, renderZone, labelForZone) {
  const forward = document.createElement("div");
  forward.className = "deck-forward deck-forward-primary";
  applyDeckStyle(forward, deckPrimaryBandStyle());
  forward.appendChild(bandLabel("Forward · primary work"));

  const stack = document.createElement("div");
  stack.className = "deck-forward-stack";
  applyDeckStyle(stack, forwardStackGridStyle(deck));

  const forwardBody = document.createElement("div");
  forwardBody.className = "deck-forward-body";
  applyDeckStyle(forwardBody, forwardBodyStyle(deck));
  for (const zoneId of deck.forward ?? ["editor"]) {
    forwardBody.appendChild(wrapZone(zoneId, "forward", renderZone, labelForZone));
  }
  stack.appendChild(forwardBody);

  if (deck.forwardDock) {
    stack.appendChild(wrapZone(deck.forwardDock, "forward-dock", renderZone, labelForZone));
  }

  forward.appendChild(stack);
  const hint = renderNavHint("F12 → MFD instruments");
  applyDeckStyle(hint, deckBandAutoStyle());
  forward.appendChild(hint);
  return forward;
}

function renderMfdBand(deck, renderZone, labelForZone) {
  const mfd = document.createElement("div");
  mfd.className = "deck-mfd deck-mfd-page";
  applyDeckStyle(mfd, deckPrimaryBandStyle());
  mfd.appendChild(bandLabel("MFD · secondary instruments"));
  const nav = renderNavHint("F12 → Forward");
  applyDeckStyle(nav, deckBandAutoStyle());
  mfd.appendChild(nav);

  const tabs = deck.mfdTabs?.length ? deck.mfdTabs : ["Project"];
  const tabBar = document.createElement("div");
  tabBar.className = "deck-mfd-tabs";
  applyDeckStyle(tabBar, deckBandAutoStyle());
  const tabPanels = document.createElement("div");
  tabPanels.className = "deck-mfd-tab-panels";
  applyDeckStyle(tabPanels, mfdTabPanelsStyle());

  let activeTab = tabs[0];

  for (const tabId of tabs) {
    const meta = REPORT_AUTHOR_TABS.find((t) => t.id === tabId) ?? { id: tabId, label: tabId };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-mfd-tab";
    btn.textContent = meta.label;
    btn.dataset.tabId = tabId;
    if (meta.disabled) {
      btn.disabled = true;
      btn.title = "Phase 2 — layout board";
    }

    const panel = document.createElement("div");
    panel.className = "deck-mfd-tab-panel";
    panel.dataset.tabId = tabId;
    panel.hidden = tabId !== activeTab;
    applyDeckStyle(panel, mfdTabPanelStyle());

    const zoneId = TAB_ZONE[tabId] ?? tabId.toLowerCase();
    panel.appendChild(wrapZone(zoneId, "mfd-tab-fill", renderZone, labelForZone));

    if (!meta.disabled) {
      btn.addEventListener("click", () => {
        activeTab = tabId;
        tabBar.querySelectorAll(".deck-mfd-tab").forEach((el) => {
          el.classList.toggle("active", el.dataset.tabId === tabId);
        });
        tabPanels.querySelectorAll(".deck-mfd-tab-panel").forEach((el) => {
          el.hidden = el.dataset.tabId !== tabId;
        });
      });
    }
    if (tabId === activeTab) btn.classList.add("active");

    tabBar.appendChild(btn);
    tabPanels.appendChild(panel);
  }

  mfd.appendChild(tabBar);

  const mfdRow = document.createElement("div");
  mfdRow.className = "deck-mfd-row";
  applyDeckStyle(mfdRow, mfdRowStyle(deck, tabs, TAB_ZONE));
  const main = document.createElement("div");
  main.className = "deck-mfd-main";
  applyDeckStyle(main, mfdMainStyle());
  main.appendChild(tabPanels);
  mfdRow.appendChild(main);

  if (deck.mfdSplit && tabs.includes("SQL") && TAB_ZONE.SQL !== deck.mfdSplit) {
    mfdRow.appendChild(wrapZone(deck.mfdSplit, "mfd-split", renderZone, labelForZone));
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

function renderCclBar() {
  const ccl = document.createElement("div");
  ccl.className = "deck-ccl";

  const row = document.createElement("div");
  row.className = "deck-ccl-input-row";

  const prefix = document.createElement("span");
  prefix.className = "deck-ccl-prefix";
  prefix.textContent = "/";
  prefix.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "deck-ccl-input";
  input.placeholder = "add card …";
  input.setAttribute("aria-label", "Command line — type / then command name");
  input.spellcheck = false;

  row.appendChild(prefix);
  row.appendChild(input);
  ccl.appendChild(row);

  const hint = document.createElement("div");
  hint.className = "deck-ccl-hint";
  hint.textContent = "Click here · type /command · Enter run · Esc cancel · Tab complete";
  ccl.appendChild(hint);

  return ccl;
}

function renderCockpit(deck) {
  const cockpit = document.createElement("div");
  cockpit.className = "deck-cockpit";

  cockpit.appendChild(renderCclBar());

  const pfd = document.createElement("div");
  pfd.className = "deck-pfd";
  pfd.innerHTML = `
    <span class="deck-pfd-chip">demo-soak</span>
    <span class="deck-pfd-chip">main</span>
    <span class="deck-pfd-meta">${deck.preset ?? "preset"} · ${deck.topology ?? "topology"}</span>`;
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

function wrapZone(zoneId, bandClass, renderZone, labelForZone) {
  const wrap = document.createElement("div");
  wrap.className = `deck-zone ${bandClass}`;
  wrap.dataset.zoneId = zoneId;
  applyDeckStyle(wrap, zonePlacementStyle(bandClass));

  const cap = document.createElement("div");
  cap.className = "deck-zone-cap";
  cap.textContent = labelForZone(zoneId);
  wrap.appendChild(cap);

  const body = document.createElement("div");
  body.className = "deck-zone-body";
  const content = renderZone(zoneId);
  if (content) body.appendChild(content);
  else body.innerHTML = `<span class="muted">${zoneId}</span>`;
  wrap.appendChild(body);

  return wrap;
}
