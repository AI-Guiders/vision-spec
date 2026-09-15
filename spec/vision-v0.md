# VisionSpec v0

Line-oriented, indentation-insensitive. `#` starts a comment. Blank lines ignored.

## Document

```text
vision <id>
  [title "<human title>"]

screen <id> [overlay]
  <blocks...>

fixture <block-id-or-role>
  <data lines>

go <from> -> <to> when <trigger>
  [then <note>]

on <block> <event> [<target>] -> <screen>
  [then <note>]

end
```

## Screens

- First declared screen without `overlay` is the **entry** screen (else first screen).
- `overlay` — rendered on dimmed backdrop over previous screen (palette pattern).

## Blocks (sketch primitives)

| Syntax | Renders |
|---|---|
| `row [ a \| b \| c ]` | horizontal split (flex) |
| `col [ a \| b ]` | vertical split |
| `panel <id>` | labeled sketch panel |
| `tree <id>` | tree; uses `fixture <id>` if present |
| `tabs <id>` | tab strip sketch |
| `preview <id>` | preview placeholder |
| `search` | search field sketch |
| `command-list` | list; uses fixture named `command-list` or last fixture |

Block ids in layouts reference nested `panel`/`tree`/etc. lines in the same screen.

**Layout binding:** `tree` / `tabs` / `preview` / `panel` blocks whose `id` appears in a `row`/`col` slot render **only inside that slot**, not again at screen root (avoids duplication).

## Fixtures

Indented or following lines under `fixture`:

```text
fixture project-tree
  demo-soak.dashspec
  diagrams/peak-kpi.dashdiagram
```

## Transitions

### `go`

| Trigger | Player behavior |
|---|---|
| `Ctrl+K`, `Escape`, `Enter` | keyboard |
| `select` | generic list pick |
| `select-command` | command-list pick |
| `double-click` | tree double-click |

### `on`

Interaction on a **block** inside a screen. Target after `->` is either:

- another **block id** in the same screen (focus / in-screen flow), e.g.  
  `on project-tree double-click file -> editor`
- a **screen id** (leave screen), e.g. legacy cross-screen handlers

Optional `then` describes side effects (open tab, show resolve, …).

Graph view: `on` edges connect **block nodes** (smaller boxes under their screen), not self-loops on the screen.

## Player modes

| Mode | Purpose |
|---|---|
| **Sketch** | Clickable wire UI + transition log |
| **Transition graph** | Screen `go` + block `on` graph; click node → jump to sketch |

## End

`end` closes document (optional if EOF).
