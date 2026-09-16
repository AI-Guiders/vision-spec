/**
 * Merge VisionSpec pack fragments (VISION-ADR-0005).
 */

/** @typedef {{ code: string, message: string, severity: "warning"|"error" }} VisionDiagnostic */

/**
 * @param {import("./vision-parser.js").VisionDocument} into
 * @param {import("./vision-parser.js").VisionDocument} from
 * @param {{ diagnostics?: VisionDiagnostic[], leafWins?: boolean }} [options]
 * @returns {import("./vision-parser.js").VisionDocument}
 */
export function mergeVisionDocuments(into, from, options = {}) {
  const diagnostics = options.diagnostics ?? [];
  const leafWins = options.leafWins === true;

  into.plugins = [...new Set([...(into.plugins ?? []), ...(from.plugins ?? [])])];
  into.defaults = { ...into.defaults, ...from.defaults };

  for (const lib of from.iconLibraries ?? []) {
    const existing = into.iconLibraries.find((l) => l.id === lib.id);
    if (existing && existing.source !== lib.source) {
      diagnostics.push({
        code: "V-I003",
        message: `Icon library "${lib.id}" source mismatch: ${existing.source} vs ${lib.source}`,
        severity: "error",
      });
    } else if (!existing) {
      into.iconLibraries.push(lib);
    }
  }

  if (from.componentRegistry) {
    if (!into.componentRegistry) {
      into.componentRegistry = {
        planetId: from.componentRegistry.planetId,
        rows: [...from.componentRegistry.rows],
      };
    } else {
      for (const row of from.componentRegistry.rows) {
        const dup = into.componentRegistry.rows.find((r) => r.id === row.id);
        if (dup) {
          diagnostics.push({
            code: "V-I001",
            message: `Duplicate component id "${row.id}" across merged registries`,
            severity: "error",
          });
        } else {
          into.componentRegistry.rows.push(row);
        }
      }
    }
  }

  for (const [id, pres] of Object.entries(from.presentations ?? {})) {
    const prev = into.presentations[id];
    if (prev && JSON.stringify(prev.kinds) !== JSON.stringify(pres.kinds)) {
      diagnostics.push({
        code: "V-I002",
        message: `Presentation "${id}" kind rows differ across imports`,
        severity: "warning",
      });
    }
    into.presentations[id] = pres;
  }

  for (const [fixtureId, fixture] of Object.entries(from.fixtures ?? {})) {
    into.fixtures[fixtureId] = fixture;
  }

  if (!leafWins) {
    if (from.catalog) into.catalog = from.catalog;
    if (from.deck) into.deck = from.deck;
  } else {
    if (from.catalog) into.catalog = from.catalog;
    if (from.deck) into.deck = from.deck;
  }

  if (from.title && !into.title) into.title = from.title;

  if (!leafWins) {
    packScenarioViolation(from, diagnostics);
  }

  return into;
}

/** @param {import("./vision-parser.js").VisionDocument} doc @param {VisionDiagnostic[]} diagnostics */
function packScenarioViolation(doc, diagnostics) {
  if (doc.screens?.length) {
    diagnostics.push({
      code: "V-I004",
      message: "Imported pack declares screen (scenario belongs in leaf)",
      severity: "error",
    });
  }
  if (doc.transitions?.length) {
    diagnostics.push({
      code: "V-I004",
      message: "Imported pack declares go (scenario belongs in leaf)",
      severity: "error",
    });
  }
  if (doc.handlers?.length) {
    diagnostics.push({
      code: "V-I004",
      message: "Imported pack declares on (scenario belongs in leaf)",
      severity: "error",
    });
  }
}

/** @returns {import("./vision-parser.js").VisionDocument} */
export function emptyVisionDocument() {
  return {
    id: "",
    title: "",
    plugins: [],
    defaults: { iconLibrary: "codicons" },
    iconLibraries: [{ id: "codicons", source: "npm:@vscode/codicons" }],
    componentRegistry: null,
    presentations: {},
    screens: [],
    fixtures: {},
    catalog: null,
    deck: null,
    transitions: [],
    handlers: [],
    diagnostics: [],
  };
}
