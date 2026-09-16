import { deckZoneIds, resolvePlugins } from "./plugins.js";
import { isComponentKind } from "./component-kinds.js";

/**
 * @param {import("./vision-parser.js").VisionDocument} doc
 * @param {{ strict?: boolean }} [options]
 */
export function validateDocument(doc, options = {}) {
  /** @type {{ code: string, message: string, severity: "warning"|"error" }[]} */
  const diagnostics = [];
  const registry = doc.componentRegistry;
  const knownComponents = new Set();

  for (const screen of doc.screens) {
    const seen = new Set();
    for (const comp of screen.components) {
      if (seen.has(comp.id)) {
        diagnostics.push({
          code: "V-C001",
          message: `Duplicate component "${comp.id}" on screen "${screen.id}"`,
          severity: "error",
        });
      }
      seen.add(comp.id);
      knownComponents.add(comp.id);

      if (!isComponentKind(comp.kind)) {
        diagnostics.push({
          code: "V-C003",
          message: `Unknown component kind "${comp.kind}" for "${comp.id}"`,
          severity: "error",
        });
      }

      if (registry) {
        const row = registry.rows.find((r) => r.id === comp.id);
        if (!row) {
          diagnostics.push({
            code: "V-C002",
            message: `Component "${comp.id}" not in registry "${registry.planetId}"`,
            severity: "error",
          });
        } else if (row.kind !== comp.kind) {
          diagnostics.push({
            code: "V-C003",
            message: `Kind mismatch for "${comp.id}": screen=${comp.kind} registry=${row.kind}`,
            severity: "error",
          });
        }
      }

      if (screen.deck) {
        const deckZones = deckZoneIds(screen, resolvePlugins(doc));
        if (!deckZones.has(comp.id)) {
          diagnostics.push({
            code: "V-C004",
            message: `Component "${comp.id}" not in deckZoneIds for screen "${screen.id}"`,
            severity: "error",
          });
        }
      }
    }
  }

  for (const fixtureId of Object.keys(doc.fixtures)) {
    if (!knownComponents.has(fixtureId)) {
      diagnostics.push({
        code: "V-C005",
        message: `Fixture "${fixtureId}" has no matching component on any screen`,
        severity: "warning",
      });
    }
  }

  for (const h of doc.handlers) {
    const declared = doc.screens.some((s) => s.components.some((c) => c.id === h.component));
    if (!declared) {
      diagnostics.push({
          code: "V-C007",
          message: `Handler references unknown component "${h.component}"`,
          severity: "error",
        });
    }
  }

  for (const [componentId, pres] of Object.entries(doc.presentations)) {
    for (const row of pres.kinds ?? []) {
      if (!row.icon?.library || !row.icon?.iconId) {
        diagnostics.push({
          code: "V-C008",
          message: `Missing icon ref for kind "${row.kind}" in presentation "${componentId}"`,
          severity: "warning",
        });
      }
    }
  }

  doc.diagnostics = diagnostics;
  if (options.strict) {
    const fatal = diagnostics.filter((d) => d.severity === "error");
    if (fatal.length) {
      throw new Error(fatal.map((d) => `${d.code}: ${d.message}`).join("\n"));
    }
  }
  return diagnostics;
}
