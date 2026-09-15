/**
 * Render STUDIO-ADR-0002 / GUIDERS report-author topology sketch.
 * Forward band · MFD (main + split) · EICAS strip.
 */

export function renderDeckScreen(screen, { renderZone, labelForZone }) {
  const deck = screen.deck;
  if (!deck) return null;

  const root = document.createElement("div");
  root.className = "deck-screen";
  root.dataset.preset = deck.preset ?? "";
  root.dataset.topology = deck.topology ?? "";

  const chrome = document.createElement("div");
  chrome.className = "deck-chrome";
  chrome.textContent = `${deck.preset ?? "preset"} · ${deck.topology ?? "topology"}`;
  root.appendChild(chrome);

  const forward = document.createElement("div");
  forward.className = "deck-forward";
  const forwardLabel = document.createElement("div");
  forwardLabel.className = "deck-band-label";
  forwardLabel.textContent = "Forward";
  forward.appendChild(forwardLabel);
  const forwardBody = document.createElement("div");
  forwardBody.className = "deck-forward-body";
  for (const zoneId of deck.forward ?? []) {
    forwardBody.appendChild(wrapZone(zoneId, "forward", renderZone, labelForZone));
  }
  forward.appendChild(forwardBody);
  root.appendChild(forward);

  const mfd = document.createElement("div");
  mfd.className = "deck-mfd";
  const mfdLabel = document.createElement("div");
  mfdLabel.className = "deck-band-label";
  mfdLabel.textContent = "MFD";
  mfd.appendChild(mfdLabel);

  const mfdRow = document.createElement("div");
  mfdRow.className = "deck-mfd-row";

  const main = document.createElement("div");
  main.className = "deck-mfd-main";
  for (const zoneId of deck.mfdSlots ?? []) {
    const wide = zoneId === "editor" || zoneId.endsWith("-editor");
    main.appendChild(wrapZone(zoneId, wide ? "mfd-wide" : "mfd", renderZone, labelForZone));
  }
  mfdRow.appendChild(main);

  if (deck.mfdSplit) {
    mfdRow.appendChild(wrapZone(deck.mfdSplit, "mfd-split", renderZone, labelForZone));
  }

  mfd.appendChild(mfdRow);
  root.appendChild(mfd);

  if (deck.eicas) {
    const eicas = document.createElement("div");
    eicas.className = "deck-eicas";
    const eicasLabel = document.createElement("div");
    eicasLabel.className = "deck-band-label";
    eicasLabel.textContent = "EICAS";
    eicas.appendChild(eicasLabel);
    eicas.appendChild(wrapZone(deck.eicas, "eicas", renderZone, labelForZone));
    root.appendChild(eicas);
  }

  return root;
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
