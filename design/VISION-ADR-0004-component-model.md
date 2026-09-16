# VISION-ADR-0004 — Component model (screens, deck zones, presentation)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-16 |
| **Relates to** | [VISION-ADR-0001](./VISION-ADR-0001-charter.md) · [VISION-ADR-0002](./VISION-ADR-0002-plugin-model.md) · [VISION-ADR-0003](./VISION-ADR-0003-gdl-inline-sections.md) · [STUDIO-ADR-0002](https://github.com/AI-Guiders/dash-spec-studio/blob/main/design/STUDIO-ADR-0002-component-model-and-navigation.md) · GUIDERS-ADR-0055 |

## Problem

VisionSpec v0 overloads the word **block**:

| Today | Meaning |
|-------|---------|
| `tree spec-tree` | sketch primitive + instance id |
| `fixture spec-tree` | freeform ASCII sample data |
| `on spec-tree …` | interaction target |
| transition graph `block:spec-tree` | graph node kind |
| STUDIO-ADR-0002 **component** | operator instrument (Project Browser, SQL Browser, …) |
| federation **deck zone** | topology slot (`spec-tree`, `editor`, …) |

Operators align **instruments** (what exists, how it looks, how you navigate between them). Fixtures alone cannot express icon/color taxonomy or typed tree nodes. The player renders monospace strings with a `FIXTURE` badge — not reviewable chrome.

Product is **pre-release**. Keeping v0 `tree <id>` syntax for compatibility creates duplicate mental models and guarantees rework when Studio reads the same manifest.

## Decision

Introduce **component** as the first-class alignment entity. **Break v0 block-instance syntax** in the same change set as this ADR (parser, player, tests, examples).

### 1. Vocabulary (four layers — do not merge)

| Layer | Role | Example |
|-------|------|---------|
| **Screen** | Navigation node; hosts components | `screen studio-mfd` |
| **Deck zone** | Federation topology slot (inline `deck` + mental-model plugin) | `mfd spec-tree \| resolve` |
| **Component** | Alignment instrument: stable id + render kind + optional presentation/fixture | `component spec-tree tree` |
| **Layout primitive** | Non-instrument layout only | `row [ a \| b ]`, `col [ … ]` |

**Rule:** deck-bound component **id equals deck zone id**. Overlay-only components (e.g. command-list) have no deck zone.

**Rule:** `row` / `col` are layout primitives, **not** components. They reference component ids in slot lists.

### 2. Syntax (authoritative)

#### 2.1 Component declaration (replaces `tree` / `tabs` / `preview` / `panel` / `repl` / `pad` / `search` / `command-list` lines)

```text
component <id> <kind>
```

| `<kind>` | Sketch behavior |
|----------|-----------------|
| `tree` | hierarchical list; uses typed `fixture <id>` |
| `tabs` | tab strip + editor placeholder |
| `preview` | report preview placeholder |
| `panel` | labeled panel (`resolve`, `layout-board`, …) |
| `repl` | data-lab / REPL sketch |
| `pad` | script pad sketch |
| `search` | search field sketch |
| `command-list` | palette list; prefers `doc.catalog`, else fixture |

**Removed (breaking):** `tree <id>`, `tabs <id>`, `preview <id>`, `panel <id>`, `repl <id>`, `pad <id>`, `search`, `command-list` as standalone screen lines.

#### 2.2 Planet component registry (optional, recommended for DashSpec Studio)

Document-level catalog of known instruments. Used for validation, default labels, and Studio manifest export.

```text
components dashspec-studio
  table zone
  | id             | kind         | label              |
  | spec-tree      | tree         | Project Browser    |
  | editor         | tabs         | Document editor    |
  | data-lab       | repl         | SQL Browser        |
  | script-pad     | pad          | Script Pad         |
  | report-preview | preview      | Report Preview     |
  | resolve        | panel        | Resolve            |
  | layout-board   | panel        | Layout board       |
end components
```

Validation when registry present:

- Every `component <id> <kind>` on a screen must match a registry row (`id` + `kind`).
- Registry rows not declared on any screen are allowed (unused instruments).

#### 2.3 Icon libraries (document + player registry)

Icons are **not** emoji, ASCII art, or inline SVG in `.vision`. Each icon is a reference into a named **icon library** (bundled icon source the player and, later, Studio resolve the same way).

**Document defaults** (optional):

```text
defaults
  icon.library = codicons
end defaults
```

**Declared libraries** (optional overrides; player has built-in catalog):

```text
icon-libraries
  codicons   source npm:@vscode/codicons
  seti       source npm:vscode-icons-js
end icon-libraries
```

| Field | Meaning |
|-------|---------|
| `<library-id>` | Stable name used in icon refs (`codicons`, `seti`, …) |
| `source npm:<package>` | Player dependency + loader path (v1: `@vscode/codicons` required) |
| `defaults icon.library` | Shorthand prefix when `icon` cell omits `library/` |

**Icon reference grammar** (in presentation tables, registry, or component chrome):

```text
<library-id>/<icon-id>     # explicit — codicons/folder
<icon-id>                  # shorthand — uses defaults icon.library
```

- **`codicons`** — VS Code UI icon font ([@vscode/codicons](https://www.npmjs.com/package/@vscode/codicons)). Sketch player loads `codicon.css` + `codicon.ttf` from the package; DOM: `<span class="codicon codicon-folder">`.
- **`seti`** (optional v1.1) — file-type icon theme for extension-based glyphs (VS Code Seti / similar). Used when kind maps to a **file extension** rather than a DashSpec artifact kind. Loader TBD; IR stays `{ library, iconId }` so Studio can map to WPF `ImageSource` later.

Player ships `player/icon-registry.js`: library id → `{ load(), render(library, iconId, el) }`. Unknown library/icon → parser warning + neutral `codicons/file` fallback in sketch.

#### 2.4 Presentation (per component, optional)

Visual alignment SSOT — **icon refs**, color tokens, operator-facing label override.

```text
presentation spec-tree
  label "Project Browser"
  table kind
  | kind         | icon                  | color-token           |
  | folder       | codicons/folder       | tree-folder           |
  | dashspec     | codicons/file-code    | artifact-dashspec     |
  | dashlibrary  | codicons/library      | artifact-dashlibrary  |
  | dashlayout   | codicons/layout       | artifact-dashlayout   |
  | dashdiagram  | codicons/graph        | artifact-dashdiagram  |
  | dashpalette  | codicons/color-mode   | artifact-dashpalette  |
  | dashcatalog  | codicons/list-tree    | artifact-dashcatalog  |
  | sql          | codicons/database     | artifact-sql          |
  | catalog-gdl  | codicons/gear         | artifact-catalog-gdl  |
end presentation
```

- **`table kind`** — artifact / node taxonomy (primarily for `tree` components).
- **`color-token`** — maps to CSS custom properties in sketch player (`--artifact-dashspec`, …). Not hex in `.vision` (theme layer stays separate).
- **`icon`** — `{ library, iconId }` after parse; never a literal glyph in source.

**Studio follow-up:** exported manifest carries the same `{ library, iconId }` pairs; WPF resolves via shared mapping table (Codicons font in Studio theme, or Fluent equivalent — separate PR).

Presentation without `table kind` may still set `label` only.

#### 2.5 Fixture (typed, keyed by component id)

**Replaces** freeform box-drawing lines. Fixture id **must** equal component id when both exist.

```text
fixture spec-tree
  folder planet-repo
    file report.dashspec dashspec
    folder libraries
      file filters.dashlibrary dashlibrary
    folder sql/migrations
      file 001_views.sql sql
end fixture
```

Grammar:

```text
fixture <component-id>
  folder <name>
    <child>+
  file <path> <kind>
end fixture
```

- `<kind>` on `file` rows resolves through `presentation spec-tree` → `table kind`.
- Unknown kind → parser warning; player falls back to `codicons/file` + neutral color token.
- Nested `folder` mirrors STUDIO-ADR-0002 §4 illustrative shape (not necessarily live repo scan).

**Non-tree fixtures** keep structured key lines (unchanged intent, explicit end):

```text
fixture data-lab
  connector demo-db
  schema reports / cards / binds
  repl SELECT COUNT(*) FROM reports
end fixture

fixture script-pad
  prompt create report with sql-server template ulsa-weekly
  plan report.dashspec · filters.dashlibrary · catalog.gdl · 001_views.sql
end fixture
```

#### 2.6 Interactions (renamed target)

```text
on <component-id> <event> [<target>] -> <component-id|screen-id>
  [then <note>]
```

IR field `handler.block` → **`handler.component`**. Graph node id `block:<id>` → **`component:<id>`**.

#### 2.7 Screen example (DashSpec Studio target)

```text
screen studio
  use-deck report-author
  component editor tabs

screen studio-mfd
  mfd-page
  use-deck report-author
  mfd-tabs Project | SQL | Pad | Preview
  component spec-tree tree
  component data-lab repl
  component script-pad pad
  component report-preview preview
  component layout-board panel
  component resolve panel

screen command-palette overlay
  component palette command-list

on spec-tree double-click file -> editor
  then open tab and show resolve
```

Note: `command-palette` screen uses component id `palette` (overlay; not a deck zone). Registry row optional.

### 3. IR shape (JSON-serializable)

```javascript
{
  iconLibraries: [{ id, source }],  // optional; player has defaults
  defaults: { iconLibrary: "codicons" },
  components: {                    // optional registry
    planetId: "dashspec-studio",
    rows: [{ id, kind, label }]
  },
  presentations: {                 // keyed by component id
    "spec-tree": {
      label: "Project Browser",
      kinds: [{ kind, icon: { library, iconId }, colorToken }]
    }
  },
  fixtures: {
    "spec-tree": {
      type: "tree",
      nodes: [ /* nested folder/file IR */ ]
    },
    "data-lab": { type: "keylines", lines: [...] }
  },
  screens: [{
    id, overlay?, deck?, mfdPage?,
    components: [{ id, kind }],    // replaces blocks[] for instruments
    layout: [{ kind: "row"|"col", slots: string[] }]
  }],
  handlers: [{
    component: "spec-tree", event, target?, toScreen, toComponent?, then?
  }]
}
```

Layout-only `row`/`col` live in `screen.layout[]`. Instrument lookup: `screen.components.find(c => c.id === zoneId)`.

### 4. Player behavior

1. **Deck renderer** (`renderZone(zoneId)`) resolves **component** by id, not legacy block.
2. **Tree renderer** walks typed fixture nodes; resolves icon via **icon-registry** → codicon (or library) + CSS color token.
3. **Zone caption** uses `presentation[id].label` → registry label → built-in fallback map → raw id.
4. **Fixture badge** remains on sketch data regions; label text **`FIXTURE DATA`** (distinguishes sample content from component chrome).
5. **Transition graph** clusters **components** inside screen clusters; node prefix `component:`.

### 5. Core vs plugin boundaries

| Concern | Owner |
|---------|--------|
| `component`, `presentation`, `icon-libraries`, typed `fixture`, `on`, `go` | **VisionSpec core** |
| `forward`, `mfd`, `mfd-tabs`, `split`, `eicas`, `use-deck` | **`aiguiders-mental-model` plugin** |
| DashSpec Studio zone ids + default registry rows | **planet `.vision`** (content), not a new npm plugin v1 |
| Prod deck topology SSOT | inline `deck` + federation parse (ADR-0003) |
| WPF `ImageSource` / theme brushes | **dash-spec-studio** resolves same `{ library, iconId }` manifest (follow-up PR) |

### 6. DashSpec Studio alignment

| STUDIO-ADR-0002 | VisionSpec |
|-----------------|------------|
| Project Browser → `spec-tree` | `component spec-tree tree` + presentation + fixture |
| SQL Browser → `data-lab` | `component data-lab repl` |
| Script Pad → `script-pad` | `component script-pad pad` |
| Report Preview → `report-preview` | `component report-preview preview` |
| Resolve → `resolve` | `component resolve panel` |

Studio `DeckIds.Zones.*` ids **must not diverge** from component ids in `examples/dashspec-studio.vision`.

Future (separate ADR): emit `VisionComponentManifest.json` from `.vision` for Studio theme — **not** required to accept this ADR.

### 7. Validation rules (parser)

| Code | Rule |
|------|------|
| `V-C001` | Duplicate component id on same screen |
| `V-C002` | Component id not in registry (when registry declared) |
| `V-C003` | Kind mismatch vs registry |
| `V-C004` | Deck-bound component id ∉ `deckZoneIds(screen)` |
| `V-C005` | Fixture present but no matching component on any screen |
| `V-C006` | `file` fixture kind unknown to presentation table (warning) |
| `V-C007` | `on` references unknown component id |
| `V-C008` | Unknown `icon` library or icon id (warning; strict mode → error) |

Warnings do not fail parse in sketch mode; errors fail `npm test`.

## Non-goals

- Pixel-perfect match to WPF Studio
- Codegen of XAML / ViewModels from `.vision`
- Replacing `*.deck.gdl` or live project tree scan in player
- Full `command-list` fuzzy engine (overlay sketch only)
- External npm plugins for presentation tables v1

## Consequences

### Breaking changes (explicit)

- Remove primitive instance lines (`tree`, `tabs`, …).
- Rename graph / handler terminology `block` → `component`.
- Replace ASCII tree fixtures with typed `folder` / `file` grammar.
- Update `spec/vision-v0.md`, `examples/*.vision`, all tests.

### Implementation checklist (single vertical PR after ADR accepted)

1. [x] `design/VISION-ADR-0004-component-model.md` → **Accepted**
2. [x] Parser: `component`, `components`, `presentation`, typed `fixture`, IR migration
3. [x] `vision-graph.js` / `vision-dot.js`: `component:` nodes
4. [x] Player: `renderComponent`, tree presentation, zone labels from presentation
5. [x] `@vscode/codicons` dep + `player/icon-registry.js` + tree row layout (codicon + label + indent)
6. [x] `sketch.css`: `--artifact-*` color tokens
7. [x] Rewrite `examples/dashspec-studio.vision` + `minimal.vision`
8. [x] Rewrite tests (`parser.test.js`, `graph.test.js`, `mental-model.test.js`, `vision-dot.test.js`, fixture tests)
9. [x] `README.md` + `vision-v0.md` sync
10. [ ] Cross-link from STUDIO-ADR-0002 → VISION-ADR-0004 (optional footnote PR in dash-spec-studio)

### Out of scope for implementation PR

- Studio WPF manifest consumer
- Auto-sync fixture from demo repo filesystem
- Presentation table editor UI

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Keep `tree <id>` as sugar forever | Two syntaxes, docs/tests drift, Studio manifest ambiguous |
| Presentation only in JS constants | Not reviewable in `.vision` diff |
| Rename `block` → `widget` | Collides with UI toolkit language; STUDIO already says **component** |
| Planet plugin `dashspec-studio-pack` for registry | Extra indirection before second planet exists |
| Emoji / ASCII icons in `.vision` | Not portable to WPF; not reviewable against prod chrome; bypasses shared icon source |

## Resolved decisions (2026-09-16)

1. **Overlay component id:** `palette` on `command-palette` overlay screen (`component palette command-list`). Catalog-only data; no separate `fixture command-list`.
2. **Registry:** `components dashspec-studio` table **required** in `examples/dashspec-studio.vision`.
3. **Deck validation:** `V-C004` uses **screen's** resolved `deckZoneIds`, not external prod `.deck.gdl` files.
4. **Icons:** **icon library refs** (`codicons/folder`, …), not emoji/ASCII. Player bundles `@vscode/codicons`; optional `seti` library later for extension-native file glyphs.

---

**Next:** implementation PR per checklist (single vertical slice).
