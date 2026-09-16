/**
 * Federation cockpit sketch (GUIDERS ADR-0021 / STUDIO ADR-0002):
 * PFD = orientation · Forward = primary work · MFD = secondary instruments (separate screen).
 */

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

  root.appendChild(renderCockpit(deck));

  if (screen.mfdPage) {
    root.appendChild(renderMfdBand(deck, renderZone, labelForZone));
  } else {
    root.appendChild(renderForwardBand(deck, renderZone, labelForZone));
    root.appendChild(renderNavHint("F12 → MFD instruments"));
  }

  if (deck.eicas) {
    const eicas = document.createElement("div");
    eicas.className = "deck-eicas deck-eicas-quiet";
    eicas.appendChild(wrapZone(deck.eicas, "eicas", renderZone, labelForZone));
    root.appendChild(eicas);
  }

  return root;
}

function renderForwardBand(deck, renderZone, labelForZone) {
  const forward = document.createElement("div");
  forward.className = "deck-forward deck-forward-primary";
  forward.appendChild(bandLabel("Forward · primary work"));
  const forwardBody = document.createElement("div");
  forwardBody.className = "deck-forward-body";
  for (const zoneId of deck.forward ?? ["editor"]) {
    forwardBody.appendChild(wrapZone(zoneId, "forward", renderZone, labelForZone));
  }
  forward.appendChild(forwardBody);
  return forward;
}

function renderMfdBand(deck, renderZone, labelForZone) {
  const mfd = document.createElement("div");
  mfd.className = "deck-mfd deck-mfd-page";
  mfd.appendChild(bandLabel("MFD · secondary instruments"));
  mfd.appendChild(renderNavHint("F12 → Forward"));

  const tabs = deck.mfdTabs?.length ? deck.mfdTabs : ["Project"];
  const tabBar = document.createElement("div");
  tabBar.className = "deck-mfd-tabs";
  const tabPanels = document.createElement("div");
  tabPanels.className = "deck-mfd-tab-panels";

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
  const main = document.createElement("div");
  main.className = "deck-mfd-main";
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
  return el;
}

function wrapZone(zoneId, bandClass, renderZone, labelForZone) {
  const wrap = document.createElement("div");
  wrap.className = `deck-zone ${bandClass}`;
  wrap.dataset.zoneId = zoneId;

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
