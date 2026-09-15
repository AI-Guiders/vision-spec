# VisionSpec

Agent-native **vision alignment** — describe screens, blocks, and transitions in text; click through a sketch in the browser. Framework-agnostic. Not a codegen SSOT (yet).

## What it is

| Is | Is not |
|---|---|
| Shared mental model before prod | WPF / React generator |
| Screen graph + sketch UI + fake fixtures | Figma pixel polish |
| Ok / not ok review loop | ANUI runtime evidence |
| Web player for fast iteration | DashSpec report domain |

## Quick start

```bash
npm run play
# or: npx --yes serve . -p 5199
```

Open http://localhost:5199/player/ — loads `examples/dashspec-studio.vision` by default.

## Example

See [`examples/dashspec-studio.vision`](examples/dashspec-studio.vision) — DashSpec Studio main shell + command palette overlay.

```text
vision dashspec-studio

screen studio
  row [ project-tree | editor | preview ]
  panel resolve

screen command-palette overlay
  search
  command-list

go studio -> command-palette when Ctrl+K
go command-palette -> studio when Escape

end
```

## Language

v0 reference: [`spec/vision-v0.md`](spec/vision-v0.md)

Charter: [`design/VISION-ADR-0001-charter.md`](design/VISION-ADR-0001-charter.md)

## Tests

```bash
node --test parser/parser.test.js
```

## License

MIT — AI Guiders
