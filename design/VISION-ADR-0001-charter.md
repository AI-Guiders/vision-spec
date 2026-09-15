# VISION-ADR-0001 — Vision alignment charter

| | |
|---|---|
| **Status** | Accepted (v0 spike) |
| **Date** | 2026-09-15 |

## Problem

Agents and operators need to agree on **UX mechanics** before choosing WPF, Electron, React, or other prod stacks. Visual tools (Figma) are heavy; codegen tools (v0) skip the alignment layer.

## Decision

**VisionSpec** is a declare-time **screen graph + sketch blocks + fixtures** language with a **web sketch player**. Output of a review cycle is human agreement, not emitted production UI.

### Non-goals (v0)

- Code generation to any UI framework
- Pixel fidelity, themes, accessibility conformance
- Replacing `*.deck.gdl`, DashSpec, or ANUI
- Complex widget configuration (CommandPalette = overlay screen, not fuzzy-search engine)

### Goals (v0)

- Text SSOT an agent can edit in small diffs
- Clickable transitions (keyboard + list picks + tree double-click)
- Fixture data for tree / command lists
- Zero build step for player (static HTML + JS)

## Review loop

```text
Agent drafts .vision → operator opens player → ok / edit text → lock inventory → prod ADR
```

## Relation to Guiders stack

| Artifact | Role |
|---|---|
| `.vision` | **What screens exist, how you move between them** |
| `.deck.gdl` | Prod topology (MFD / Forward) — later |
| DashSpec | Report domain |
| ANUI | Live UI + evidence |
