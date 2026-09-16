/**
 * Vision IR helpers — map federation parser JSON to player / deck plugin shapes.
 */

/** Split GDL wire tokens like "ccl | editor" into deck zone ids. */
export function expandDeckZoneList(zones) {
  return (zones ?? []).flatMap((z) =>
    String(z)
      .split(/\s*\|\s*/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function rowGet(row, key) {
  return row?.[key] ?? row?.[key.toLowerCase()] ?? "";
}

/** @param {import("./gdl-bridge.js").invokeGdlBridgeSync extends (...args: any) => infer R ? R : never} catalog */
export function paletteRowsFromCatalog(catalog) {
  if (!catalog?.commands?.length) return [];

  const phraseByName = new Map(
    (catalog.phrases ?? []).map((p) => [rowGet(p, "name"), p]),
  );

  const hotkeyByCommand = new Map();
  for (const b of catalog.bindings ?? []) {
    const cmd = rowGet(b, "command").trim();
    const gesture = rowGet(b, "gesture").trim();
    if (cmd && gesture && cmd !== "—" && cmd !== "-") hotkeyByCommand.set(cmd, gesture);
  }

  return catalog.commands.map((row) => {
    const commandId = rowGet(row, "command");
    const phraseName = rowGet(row, "phrase");
    const phraseRow = phraseByName.get(phraseName);
    const phraseText = rowGet(phraseRow ?? {}, "phrase") || phraseName.replace(/-/g, " ");
    const help = rowGet(row, "help") || rowGet(row, "summary") || commandId;
    const invoke = phraseText
      ? `/${phraseText.replace(/\{[^}]+\}/g, "").trim()}`
      : `/${commandId.replace(/\./g, " ")}`;
    return {
      title: help,
      invoke,
      hotkey: hotkeyByCommand.get(commandId) ?? "",
      help: rowGet(row, "category") || rowGet(row, "scope"),
      commandId,
    };
  });
}

/** @param {ReturnType<import("./gdl-bridge.js").parseDeckViaBridge> | null | undefined} deck @param {string} presetName */
export function deckPresetToScreenDeck(deck, presetName) {
  const preset = deck?.presets?.find((p) => p.name === presetName);
  if (!preset) return null;
  return {
    preset: preset.name,
    topology: preset.topology,
    forward: expandDeckZoneList(preset.forward),
    mfdSlots: expandDeckZoneList(preset.mfdSlots),
    mfdTabs: preset.mfdTabs,
    mfdSplit: preset.mfdSplit,
    eicas: preset.eicas,
  };
}
