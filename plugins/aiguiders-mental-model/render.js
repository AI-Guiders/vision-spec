/**
 * Render STUDIO-ADR-0002 report-author sketch:
 * Cockpit + PFD · Forward · MFD tabs + split · EICAS
 */

const REPORT_AUTHOR_TABS = [
  { id: "Project", label: "Project" },
  { id: "Layout", label: "Layout*", disabled: true },
  { id: "Pad", label: "Pad" },
];

const TAB_ZONE = {
  Layout: "layout-board",
  Pad: "script-pad",
};

export function renderDeckScreen(screen, { renderZone, labelForZone }) {
  const deck = screen.deck;
  if (!deck) return null;

  const root = document.createElement("div");
  root.className = "deck-screen";
  root.dataset.preset = deck.preset ?? "";
  root.dataset.topology = deck.topology ?? "";

  root.appendChild(renderCockpit(deck));

  const forward = document.createElement("div");
  forward.className = "deck-forward";
  forward.appendChild(bandLabel("Forward · 2nd monitor (STUDIO-ADR-0001)"));
  const forwardBody = document.createElement("div");
  forwardBody.className = "deck-forward-body";
  for (const zoneId of deck.forward ?? []) {
    forwardBody.appendChild(wrapZone(zoneId, "forward", renderZone, labelForZone));
  }
  forward.appendChild(forwardBody);
  root.appendChild(forward);

  const mfd = document.createElement("div");
  mfd.className = "deck-mfd";
  mfd.appendChild(bandLabel("MFD"));

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

    if (tabId === "Project") {
      const row = document.createElement("div");
      row.className = "deck-mfd-project-row";
      for (const zoneId of deck.mfdSlots ?? []) {
        const wide = zoneId === "editor" || zoneId.endsWith("-editor");
        row.appendChild(wrapZone(zoneId, wide ? "mfd-wide" : "mfd-narrow", renderZone, labelForZone));
      }
      panel.appendChild(row);
    } else if (TAB_ZONE[tabId]) {
      panel.appendChild(wrapZone(TAB_ZONE[tabId], "mfd-tab-fill", renderZone, labelForZone));
    } else {
      panel.innerHTML = `<span class="muted">${tabId} tab</span>`;
    }

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

  if (deck.mfdSplit) {
    mfdRow.appendChild(wrapZone(deck.mfdSplit, "mfd-split", renderZone, labelForZone));
  }

  mfd.appendChild(mfdRow);
  root.appendChild(mfd);

  if (deck.eicas) {
    const eicas = document.createElement("div");
    eicas.className = "deck-eicas deck-eicas-quiet";
    eicas.appendChild(wrapZone(deck.eicas, "eicas", renderZone, labelForZone));
    root.appendChild(eicas);
  }

  return root;
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
    <span class="deck-pfd-chip">demo-db · OK</span>
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
