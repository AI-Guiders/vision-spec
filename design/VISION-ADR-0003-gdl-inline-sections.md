# VISION-ADR-0003 — Inline GDL sections (self-contained documents)

| | |
|---|---|
| **Status** | Accepted (v0 spike) |
| **Date** | 2026-09-15 |
| **Relates to** | [VISION-ADR-0001](./VISION-ADR-0001-charter.md) · [VISION-ADR-0002](./VISION-ADR-0002-plugin-model.md) · [VISION-ADR-0005](./VISION-ADR-0005-federation-import-composition.md) · GUIDERS catalog/deck grammar |

## Problem

VisionSpec must be **self-contained at the review leaf**: one entry `.vision` is enough to review **screens, transitions, commands, and scenario** in the sketch player. Reusable planet material (components, presentation, fixtures) MAY compose via federation `import` — see [VISION-ADR-0005](./VISION-ADR-0005-federation-import-composition.md). Ad-hoc fixtures and JS re-parsers duplicate federation GDL and drift from prod catalogs.

## Decision

1. **Inline GDL sections** at document top level:
   - `catalog <id> … end catalog`
   - `deck <id> … end deck`

2. **Vision parser = section router** — extracts GDL spans, wraps document headers (`catalog` / `deck`), **does not parse GDL grammar**.

3. **Authoritative parse = federation F#** — `CatalogParser` / `DeckParser` via `tools/VisionGdlBridge` (thin CLI, JSON IR to JS). No second dialect, no `gdl-inline.js` fork.

4. **Runtime wiring:**
   - **Node / tests:** `parser/gdl-bridge.js` → `dotnet run` VisionGdlBridge
   - **Browser player:** `scripts/vision-play-server.mjs` exposes `POST /__vision/gdl` → same bridge
   - **IR mapping only in JS:** `parser/gdl-ir.js` (palette rows, `use-deck` binding)

5. **Vision-only deck extensions** (`mfd-tabs`, `split`) stay on **screen** lines (mental-model plugin), not in federation `deck` blocks.

6. **Screen binding:** `use-deck <preset>` applies inline `doc.deck` preset to `screen.deck`.

## Non-goals

- Replacing prod `*.catalog.gdl` / `*.deck.gdl` SSOT
- Full channels/profiles validation in sketch player
- guiders-js text parser (IR index only today)

## Consequences

- `npm test` builds bridge first; `gdl-bridge.test.js` asserts federation parse
- `npm run play` uses dev server with GDL bridge (not raw `serve` without dotnet)
- Deleted: `parser/gdl-inline.js` (JS grammar fork)
