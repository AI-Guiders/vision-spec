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

Event on a block inside a screen, e.g. `on project-tree double-click file -> studio`.

## End

`end` closes document (optional if EOF).
