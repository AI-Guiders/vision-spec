# VISION-ADR-0005 — Composition via federation `import` (GUIDERS-0052)

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-09-16 |
| **Relates to** | [VISION-ADR-0001](./VISION-ADR-0001-charter.md) · [VISION-ADR-0003](./VISION-ADR-0003-gdl-inline-sections.md) · [VISION-ADR-0004](./VISION-ADR-0004-component-model.md) · [GUIDERS-ADR-0048](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0048-authoring-quarry-family.md) · [GUIDERS-ADR-0051](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0051-authoring-project-abstraction.md) · [GUIDERS-ADR-0052](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0052-unified-import-directive.md) · [GUIDERS-ADR-0059](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0059-gdl-hyperlane.md) · [DASHSPEC-ADR-0017](https://github.com/AI-Guiders/dash-spec/blob/main/design/DASHSPEC-ADR-0017-file-includes-and-stdlib.md) |
| **Amends** | [VISION-ADR-0003](./VISION-ADR-0003-gdl-inline-sections.md) — self-contained rule scoped to **leaf** documents; planet packs compose via `import`. |

## Problem

After [VISION-ADR-0004](./VISION-ADR-0004-component-model.md), a planet `.vision` carries:

- `components` registry
- `presentation` tables (icon library refs)
- typed `fixture` trees
- inline `catalog` / `deck` (ADR-0003)
- screens, `go`, `on` (alignment scenario)

`examples/dashspec-studio.vision` is already a **planet pack + scenario** in one file. Copy-paste into a second planet (DBA Studio, Glass) will drift.

Federation already standardised document composition:

| ADR | Rule |
|-----|------|
| **GUIDERS-0052** | One keyword: `import`. `"logical"` vs `<wire/lib>`. `!include` deprecated. |
| **GUIDERS-0048 / 0059** | Authoring quarry kit: `keyword … end keyword`, `* table`, `#`, **`import`** |
| **DASHSPEC-0017** | Planet `import "…"` / glob; stdlib `<…>` |
| **Authoring.Core** | `AuthoringImportLine.TryParse` — shared parser, no per-grammar fork |

VisionSpec inventing `include … from` or a bespoke `use file` would **break cross-DSL consistency** — the exact problem the federation authoring guild was created to prevent.

[VISION-ADR-0003](./VISION-ADR-0003-gdl-inline-sections.md) said «one `.vision` file is enough». That remains true for the **review leaf** (screens + transitions). It is **not** a ban on federation import for reusable planet material.

## Decision

VisionSpec adopts **GUIDERS-ADR-0052 `import`** for composition. **No new include keyword.** Parser MUST delegate line recognition to the same rules as `AuthoringImportLine.TryParse` (ported to JS for the sketch player, or bridged via a thin CLI later).

### 1. Document roles (two tiers)

| Tier | File role | Typical contents | Review focus |
|------|-----------|------------------|--------------|
| **Leaf** | `*.vision` entry opened in player | `vision`, `use`, `import` of packs, **screens**, `go`, `on`, optional inline catalog/deck overrides | Navigation / scenario agreement |
| **Planet pack** | imported `*.vision` fragments | `components`, `presentation`, `icon-libraries`, shared `fixture`, optional shared `catalog`/`deck` | Chrome / registry / sample data |

**Rule:** leaf documents SHOULD stay small enough for one PR review of **scenario** changes. Planet packs SHOULD hold material reused across leaf files or repos.

**Rule:** `screen` / `go` / `on` MUST NOT live only in a pack imported by multiple leaves unless the pack is explicitly marked **scenario** (discouraged v1 — prefer leaf-only scenarios).

### 2. Import syntax (normative — GUIDERS-0052)

```text
import "authoring/dashspec-studio.planet.vision"
import "authoring/presentation/spec-tree.vision"
import <dashspec-studio/vision/planet>
import <federation/vision/icon-defaults> as icon-defaults
```

| Form | Target | Resolver |
|------|--------|----------|
| `import "…"` | Logical path relative to **vision project root** (see §4) | Read file(s); glob allowed in quotes (sorted expand, explicit only — DashSpec ADR-0017 / ADR-0024 rule) |
| `import <…>` | Wire library / planet stdlib | Federation bundle or planet resolver — **not** `path.join` semantics |
| `… as alias` | Optional | Namespaced merge prefix for registry rows (see §3) |

**Forbidden in new VisionSpec files:** `include`, bespoke `use file`. Parser MAY accept `!include` as deprecated alias with lint warning (DashSpec transition parity).

**Forbidden:** Vision-specific keywords (`include from`, `@import`).

### 3. Merge semantics (flatten before IR)

Parser pipeline:

```text
1. Parse leaf + recursively resolve import "…" (cycle detection)
2. For each import <…> — resolve via wire catalog (v1: stub error unless player bundles known wires)
3. Merge pack sections into one VisionDocument IR
4. validateDocument (ADR-0004 rules)
5. Player / graph consume flat IR only
```

**Merge rules** (later import wins on conflict unless noted):

| Section | Merge |
|---------|--------|
| `components` registry | Union rows; duplicate `id` → error **V-I001** |
| `presentation <id>` | Last wins per component id; **V-I002** warning if kinds differ |
| `icon-libraries` | Union by library id; duplicate source mismatch → error **V-I003** |
| `fixtures` | Last wins per fixture id |
| `defaults` | Last wins per key |
| `catalog` / `deck` | Inline leaf overrides imported pack (leaf wins) |
| `screens`, `transitions`, `handlers` | **Leaf only** — imported packs MUST NOT declare these (**V-I004** error) |
| `plugins` | Union |

**Alias (`as`):** v1 reserved — parser accepts, merge unchanged; full namespacing deferred to v1.1.

**Glob:** `import "authoring/*.planet.vision"` expands to sorted explicit paths; each file merged in order.

### 4. Vision project root (logical paths)

Align with [GUIDERS-ADR-0051](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0051-authoring-project-abstraction.md):

| Context | Root |
|---------|------|
| `npm test` / Node parser | Directory containing entry `.vision` (single-file) **or** nearest manifest (future) |
| Browser player | Directory of opened `.vision` file; `import "…"` via play-server same origin |
| IDE / CDP (future) | `Authoring.Project` graph walker |

v1 sketch player: **entry file directory** is project root.

### 5. Recommended layout (DashSpec Studio example)

```text
vision-spec/examples/
  dashspec-studio.vision          # leaf — scenario
  authoring/
    dashspec-studio.planet.vision # pack — components, presentations, fixtures
```

**Leaf** (scenario only):

```text
vision dashspec-studio
  use aiguiders-mental-model

import "authoring/dashspec-studio.planet.vision"

catalog dashspec-studio
  …
end catalog

screen studio
  component editor tabs
  …

go studio -> studio-mfd when F12
on spec-tree double-click file -> editor
end
```

**Pack** (no screens / go / on):

```text
defaults
  icon.library = codicons
end defaults

components dashspec-studio
  table zone
  …
end components

presentation spec-tree
  …
end presentation

fixture spec-tree
  …
end fixture
```

Inline `catalog` / `deck` in leaf remain valid (ADR-0003).

### 6. Parser / player implementation

| Layer | Approach |
|-------|----------|
| **Import line parse** | `parser/authoring-import.js` — match `AuthoringImportLine` + conformance vectors |
| **Resolve** | `parser/vision-compose.js` — load tree, merge, diagnostics |
| **Player** | Flat IR only after compose |
| **Wire imports** | v1 optional stub |

**Do not** reimplement quote/angle-bracket rules ad hoc.

### 7. Relationship to GDL quarries

VisionSpec stays alignment-only (ADR-0001). `.vision` is not a GDL quarry token (0059).

Shared kit with GDL (0048 §3): blocks, tables, `#`, **`import`**.

### 8. Validation codes

| Code | Rule |
|------|------|
| `V-I001` | Duplicate component `id` across merged registries |
| `V-I002` | Same presentation id, different kind rows (warning) |
| `V-I003` | Same icon library id, different `source` |
| `V-I004` | Pack declares `screen`, `go`, or `on` |
| `V-I005` | Import cycle |
| `V-I006` | Unresolved logical path or wire |

## Non-goals

- `Authoring.Project` manifest v1
- Wire stdlib in browser player v1
- `import` of `.catalog.gdl` / `.deck.gdl` (stay ADR-0003 GDL bridge)
- Cross-repo URL imports

## Consequences

### Amends VISION-ADR-0003

- **After:** one **leaf** `.vision` = self-contained **scenario**; planet material MAY compose via federation `import`.
- Inline `catalog` / `deck` in leaf remain valid.

### Breaking changes

None until pack split PR. Monolithic example stays valid until then.

### Implementation checklist

1. [ ] Accept ADR-0005
2. [ ] `parser/authoring-import.js` + conformance tests
3. [ ] `parser/vision-compose.js` — merge + `V-I*`
4. [ ] `parseVision` → compose
5. [ ] Play-server resolves logical imports
6. [ ] Split `dashspec-studio.vision` → leaf + pack
7. [ ] Update `vision-v0.md`, ADR-0003 cross-link
8. [ ] `npm test` green

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Vision-only `include` | Diverges from GUIDERS-0052 |
| Monolithic forever | Pack duplication |
| Import screens from pack | Leaf = scenario review breaks |
| Wait for Authoring.Project | JS import port is enough v1 |

---

**Acceptance:** operator confirms GUIDERS-0052 alignment + leaf/pack split + merge rules. Then implementation PR.
