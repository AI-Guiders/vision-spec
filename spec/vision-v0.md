# VisionSpec v0

Line-oriented, indentation-insensitive. `#` starts a comment. Blank lines ignored.

## Document

```text
vision <id>
  [title "<human title>"]
  [use <plugin-id> ...]

import <federation/vision/icon-defaults>
import "authoring/registry/*.vision"
import "authoring/components/*.vision"

defaults
  icon.library = codicons
end defaults

icon-libraries
  codicons source npm:@vscode/codicons
end icon-libraries

components <planet-id>
  table zone
  | id | kind | label |
end components

presentation <component-id>
  label "…"
  table kind
  | kind | icon | color-token |
end presentation

catalog <id> … end catalog
deck <id> … end deck

screen <id> [overlay]
  component <id> <kind>
  row [ a | b ]
  col [ a | b ]
  [<plugin deck lines — see Plugins>]

fixture <component-id>
  folder <name> …
  file <path> <kind>
  [key lines for non-tree fixtures]
end fixture

go <from> -> <to> when <trigger>
  [then <note>]

on <component> <event> [<target>] -> <component|screen>
  [then <note>]

end
```

## Composition (federation import)

VisionSpec adopts **GUIDERS-ADR-0052** `import` for planet packs. Logical paths are relative to the **vision project root** declared in a `.visionproj` manifest (VISION-ADR-0006) or the entry file directory for single-file opens.

| Form | Meaning |
|---|---|
| `import "authoring/base.vision"` | Logical file path |
| `import "authoring/components/*.vision"` | Glob expand (sorted) |
| `import <wire/lib>` | Wire stdlib via `stdlib/wires/` (e.g. `<federation/vision/icon-defaults>`) |

Leaf files hold **screens**, `go`, `on`, and optional inline `catalog`/`deck`. Imported packs hold `components`, `presentation`, `fixture`, shared defaults — see `design/VISION-ADR-0005-federation-import-composition.md`.

**Browser player:** single-file open parses inline content only. Files with `import` need **Open project** — select the directory containing a `.visionproj` manifest; server composes via `POST /__vision/project`. Examples load via `examples/dashspec-studio.visionproj`.

## Screens

- First declared screen without `overlay` is the **entry** screen (else first screen).
- `overlay` — rendered on dimmed backdrop over previous screen (palette pattern).

## Components (alignment instruments)

| Syntax | Renders |
|---|---|
| `component <id> <kind>` | instrument instance on screen |
| `row [ a \| b \| c ]` | horizontal split (layout primitive) |
| `col [ a \| b ]` | vertical split (layout primitive) |

| `<kind>` | Sketch behavior |
|---|---|
| `tree` | hierarchical list; typed `fixture <id>` |
| `tabs` | tab strip sketch |
| `preview` | preview placeholder |
| `panel` | labeled panel |
| `repl` | data-lab / REPL sketch |
| `pad` | script pad sketch |
| `search` | search field sketch |
| `command-list` | palette list; uses `doc.catalog` when present |

Component ids in layout slots and deck zones reference `component` lines on the same screen. Deck-bound component **id equals deck zone id**.

**Layout binding:** components whose `id` appears in a `row`/`col` slot or plugin deck zone render **only inside that slot**, not again at screen root.

## Presentation & icons

- `presentation <component-id>` — optional label override + `table kind` mapping artifact kinds to icon refs (`codicons/folder`) and color tokens (`tree-folder`).
- Player resolves icons via bundled `@vscode/codicons`; color tokens map to CSS custom properties (`--artifact-dashspec`, …).

## Fixtures

Typed tree (preferred for `tree` components):

```text
fixture spec-tree
  folder planet-repo
    file report.dashspec dashspec
end fixture
```

Non-tree fixtures use key lines under `fixture … end fixture`.

## Transitions

### `go`

Keyboard / list triggers (`Ctrl+K`, `Escape`, `select-command`, `F12`, …).

### `on`

Interaction on a **component**. Target after `->` is another **component id** (focus / cross-screen) or a **screen id**.

Graph view: `on` edges connect **component nodes** (`component:<id>`) inside screen clusters.

## Plugins

```text
use aiguiders-mental-model
```

Federation deck topology (`forward`, `mfd`, `mfd-tabs`, `split`, `eicas`, `use-deck`) — see `design/VISION-ADR-0002-plugin-model.md`.

## Player modes

| Mode | Purpose |
|---|---|
| **Sketch** | Clickable wire UI + transition log |
| **Transition graph** | Screen `go` + component `on` graph |

## End

`end` closes document (optional if EOF).
