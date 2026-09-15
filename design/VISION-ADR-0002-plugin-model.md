# VISION-ADR-0002 — Plugin model (everything extends core)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-15 |
| **Relates to** | [VISION-ADR-0001](./VISION-ADR-0001-charter.md) · GUIDERS-ADR-0007 · GUIDERS-ADR-0058 · GUIDERS-ADR-0055 |

## Problem

VisionSpec core must stay **domain-agnostic** (any UI alignment). Federation mental model (Forward / MFD / EICAS, topology, deck presets) is shared by Glass, DashSpec Studio, DBA Studio — it must not be baked into core syntax.

## Decision

### Core (non-negotiable)

- `vision`, `screen`, `overlay`, `fixture`, `go`, `on`, `then`, `end`
- Generic layout: `row`, `col`
- Generic blocks: `tree`, `tabs`, `preview`, `panel`, `search`, `command-list`, `repl`
- `use <plugin-id>` — loads registered extension for this document

Core does **not** define: cockpit, deck, forward, mfd, eicas, planet zone catalogs.

### Plugin contract (v1)

```javascript
{
  id: string,
  parseScreenLine(ctx, trimmed, lineNo) => { handled: boolean },
  deckZoneIds(screen) => Set<string>,      // optional
  renderScreen?(screen, helpers) => HTMLElement | null,
}
```

- Parser calls each active plugin's `parseScreenLine` before core block rules.
- Player calls first plugin `renderScreen` that returns non-null for screens with `screen.deck`.
- Planets ship **content** (zone ids, fixtures, transitions) inside `.vision`; federation ships **mental-model** plugin.

### First plugin: `aiguiders-mental-model`

Mirrors federation presentation vocabulary (ADR-0007 displays, ADR-0058 topology wire, ADR-0055 deck preset lines) for **alignment sketch only** — not prod emit, not a replacement for `.deck.gdl`.

Screen lines when plugin active:

```text
preset report-author
topology (MFD)(F)
forward report-preview
mfd-tabs Project | Layout | Pad
mfd spec-tree | editor
split data-lab
eicas resolve
```

Produces `screen.deck` IR consumed by player layout renderer.

### Planet content

DashSpec Studio `.vision` uses mental-model topology + planet zone ids (`spec-tree`, `editor`, `report-preview`, `data-lab`, `resolve`) per STUDIO-ADR-0002 — not a `dashspec-studio-pack` plugin.

## Non-goals

- Codegen to WPF / deck emit from VisionSpec
- Loading arbitrary npm plugins at runtime (built-in registry v1)
