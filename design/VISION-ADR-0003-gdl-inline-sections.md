# VISION-ADR-0003 — Inline GDL sections (self-contained documents)

| | |
|---|---|
| **Status** | Accepted (v0 spike) |
| **Date** | 2026-09-15 |
| **Relates to** | [VISION-ADR-0001](./VISION-ADR-0001-charter.md) · [VISION-ADR-0002](./VISION-ADR-0002-plugin-model.md) · GUIDERS catalog/deck grammar |

## Problem

VisionSpec must be **self-contained**: one `.vision` file is enough for alignment review (screens, transitions, commands, deck). Ad-hoc fixtures (`Save … | /save | …`) duplicate federation GDL and drift from prod catalogs.

## Decision

1. **Inline GDL sections** at document top level — not external file refs:
   - `catalog <id> … end catalog` — commands, phrases, bindings, defaults (GDL table syntax)
   - `deck <id> … end deck` — preset blocks (same lines as `*.deck.gdl`)

2. **Borrow grammar, not runtime** — table rows, `defaults` key = value, `end <section>` blocks mirror `CatalogParser` / `DeckParser` in federation. VisionSpec does **not** invent a second command dialect.

3. **Parser routing (v0)** — `parser/gdl-inline.js` in vision-spec player (JS subset). Full F# parity and guiders-js wiring are **follow-up**, not blockers for DashSpec Studio alignment.

4. **Screen binding** — `use-deck <preset>` on a screen applies `doc.deck.presets[]` to `screen.deck` (mental-model plugin). Deck lines on screen remain valid for legacy examples; prefer `use-deck` + inline `deck`.

5. **Palette** — `command-list` block reads `doc.catalog` via `paletteRowsFromCatalog()`; fixture fallback only for minimal examples without catalog.

## Non-goals (this ADR)

- JSON emit / gdlc build step for the web player
- Full channels / profiles / mcp validation in vision player
- Replacing prod `*.catalog.gdl` SSOT — vision is alignment copy; Studio prod still ships separate GDL files

## Relation to guiders-js

`@aiguiders/command-plane-catalog` indexes **parsed IR**, not GDL text. VisionSpec v0 parses inline catalog in JS; later: shared parser package or guiders-js `@aiguiders/authoring` catalog slice when published.

## Consequences

- `dashspec-studio.vision` carries inline catalog + deck; pipe `command-list` fixture removed
- Tests: `parser/gdl-inline.test.js` + parser integration on example
- Charter non-goal «CommandPalette = overlay, not fuzzy engine» unchanged — player sketch only
