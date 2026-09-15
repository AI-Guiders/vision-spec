/**
 * Minimal inline GDL subset for VisionSpec (tables + defaults + deck preset).
 * Grammar mirrors federation CatalogParser / DeckParser — not a second dialect.
 */

const CATALOG_SECTIONS = new Set([
  "defaults",
  "commands",
  "phrases",
  "bindings",
  "helps",
  "channels",
]);

const DECK_PRESET_LINES = {
  topology: /^topology\s+((?:\([^)]+\))+)\s*$/i,
  forward: /^forward\s+(.+)$/i,
  mfd: /^mfd\s+(.+)$/i,
  "mfd-tabs": /^mfd-tabs\s+(.+)$/i,
  split: /^split\s+(\S+)\s*$/i,
  eicas: /^eicas\s+(\S+)\s*$/i,
};

/** @param {string} text */
export function splitCells(text) {
  const inner = text.trim();
  if (!inner.startsWith("|")) return [];
  let body = inner.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((c) => c.trim());
}

/** @param {string[]} bodyLines */
export function parseTableMaps(bodyLines) {
  const rows = bodyLines
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"))
    .map(splitCells);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  return rows.slice(1).filter((cells) => !isSeparatorRow(cells)).map((cells) => {
    /** @type {Record<string, string>} */
    const map = {};
    for (let i = 0; i < header.length && i < cells.length; i += 1) {
      if (header[i]) map[header[i]] = cells[i];
    }
    return map;
  });
}

/** @param {string[]} cells */
function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => c.length > 0 && /^-+$/.test(c.replace(/\s/g, "")));
}

/**
 * @param {string[]} lines raw lines inside `catalog … end catalog`
 * @param {string} id
 */
export function parseInlineCatalog(lines, id) {
  /** @type {Record<string, string>} */
  const defaults = {};
  /** @type {Record<string, string>[]} */
  let commands = [];
  /** @type {Record<string, string>[]} */
  let phrases = [];
  /** @type {Record<string, string>[]} */
  let bindings = [];
  /** @type {Record<string, string>[]} */
  let helps = [];

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    i += 1;
    if (!trimmed || trimmed.startsWith("#")) continue;

    const section = sectionKeyword(trimmed);
    if (!section) continue;

    const { body, next } = readClosedBlock(lines, i, section.kw);
    i = next;

    if (section.kw === "defaults") {
      for (const line of body) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const kv = t.split("=").map((p) => p.trim());
        if (kv.length === 2) defaults[kv[0]] = kv[1];
      }
    } else if (section.kw === "commands") {
      commands = parseTableMaps(body);
    } else if (section.kw === "phrases") {
      phrases = parseTableMaps(body);
    } else if (section.kw === "bindings") {
      bindings = parseTableMaps(body);
    } else if (section.kw === "helps") {
      helps = parseTableMaps(body);
    }
  }

  return { id, defaults, commands, phrases, bindings, helps };
}

/**
 * @param {string[]} lines inside `deck … end deck`
 * @param {string} id
 */
export function parseInlineDeck(lines, id) {
  /** @type {{ name: string, topology?: string, forward?: string[], mfdSlots?: string[], mfdTabs?: string[], mfdSplit?: string, eicas?: string }[]} */
  const presets = [];

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    i += 1;
    if (!trimmed || trimmed.startsWith("#")) continue;

    const presetMatch = trimmed.match(/^preset\s+(\S+)\s*$/i);
    if (!presetMatch) continue;

    const { body, next } = readClosedBlock(lines, i, "preset");
    i = next;
    presets.push(parsePresetBody(presetMatch[1], body));
  }

  return { id, presets };
}

/** @param {string} name @param {string[]} body */
function parsePresetBody(name, body) {
  /** @type {ReturnType<typeof parseInlineDeck>['presets'][0]} */
  const preset = { name };
  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;
    for (const [key, re] of Object.entries(DECK_PRESET_LINES)) {
      const m = line.match(re);
      if (!m) continue;
      if (key === "topology") preset.topology = m[1];
      else if (key === "forward") preset.forward = m[1].split(/\s+/).filter(Boolean);
      else if (key === "mfd") preset.mfdSlots = m[1].split("|").map((s) => s.trim()).filter(Boolean);
      else if (key === "mfd-tabs") preset.mfdTabs = m[1].split("|").map((s) => s.trim()).filter(Boolean);
      else if (key === "split") preset.mfdSplit = m[1];
      else if (key === "eicas") preset.eicas = m[1];
    }
  }
  return preset;
}

/** @param {string} trimmed */
function sectionKeyword(trimmed) {
  for (const kw of CATALOG_SECTIONS) {
    if (trimmed.toLowerCase() === kw) return { kw, table: false };
    if (trimmed.toLowerCase() === `${kw} table`) return { kw, table: true };
  }
  return null;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {string} kw
 */
function readClosedBlock(lines, start, kw) {
  const body = [];
  let i = start;
  const endRe = new RegExp(`^end\\s+${kw}\\s*$`, "i");
  while (i < lines.length) {
    const t = lines[i].trim();
    if (endRe.test(t)) return { body, next: i + 1 };
    body.push(lines[i]);
    i += 1;
  }
  throw new Error(`Missing end ${kw}`);
}

/**
 * Build palette rows from inline catalog IR.
 * @param {ReturnType<parseInlineCatalog> | null | undefined} catalog
 */
export function paletteRowsFromCatalog(catalog) {
  if (!catalog) return [];

  const phraseByName = new Map(
    catalog.phrases.map((p) => [p.name ?? p.phrase, p]),
  );

  const hotkeyByCommand = new Map();
  for (const b of catalog.bindings) {
    const cmd = b.command?.trim();
    const gesture = b.gesture?.trim();
    if (cmd && gesture && cmd !== "—" && cmd !== "-") hotkeyByCommand.set(cmd, gesture);
  }

  return catalog.commands.map((row) => {
    const commandId = row.command ?? "";
    const phraseName = row.phrase ?? "";
    const phraseRow = phraseByName.get(phraseName);
    const phraseText = phraseRow?.phrase ?? phraseName.replace(/-/g, " ");
    const help = row.help ?? row.summary ?? commandId;
    const invoke = phraseText ? `/${phraseText.replace(/\{[^}]+\}/g, "").trim()}` : `/${commandId.replace(/\./g, " ")}`;
    return {
      title: help,
      invoke,
      hotkey: hotkeyByCommand.get(commandId) ?? "",
      help: row.category ?? row.scope ?? "",
      commandId,
    };
  });
}

/**
 * @param {ReturnType<parseInlineDeck> | null | undefined} deck
 * @param {string} presetName
 */
export function deckPresetToScreenDeck(deck, presetName) {
  const preset = deck?.presets?.find((p) => p.name === presetName);
  if (!preset) return null;
  return {
    preset: preset.name,
    topology: preset.topology,
    forward: preset.forward,
    mfdSlots: preset.mfdSlots,
    mfdTabs: preset.mfdTabs,
    mfdSplit: preset.mfdSplit,
    eicas: preset.eicas,
  };
}

/**
 * @param {string[]} allLines full document lines
 * @param {number} start index of `catalog …` line
 * @param {string} closeKw e.g. catalog
 */
export function readTopLevelBlock(allLines, start, closeKw) {
  const body = [];
  let i = start + 1;
  const endRe = new RegExp(`^end\\s+${closeKw}\\s*$`, "i");
  while (i < allLines.length) {
    const t = allLines[i].trim();
    if (endRe.test(t)) return { body, next: i + 1 };
    body.push(allLines[i]);
    i += 1;
  }
  throw new Error(`Missing end ${closeKw}`);
}
