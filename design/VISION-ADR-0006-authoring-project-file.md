# VISION-ADR-0006 — Authoring project file (`.visionproj`)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-16 |
| **Relates to** | [VISION-ADR-0005](./VISION-ADR-0005-federation-import-composition.md) · [GUIDERS-ADR-0051](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0051-authoring-project-abstraction.md) · [GUIDERS-ADR-0052](https://github.com/AI-Guiders/guiders-platform/blob/main/docs/adr/GUIDERS-ADR-0052-unified-import-directive.md) |
| **Amends** | [VISION-ADR-0005 §4](./VISION-ADR-0005-federation-import-composition.md) — project root from manifest, not entry directory alone |

## Problem

After ADR-0005, logical `import "…"` paths resolve relative to a **vision project root**. The sketch player used **Open project folder** (`webkitdirectory`) and guessed the leaf entry — not an authoring project.

Federation already defines `Authoring.Project` manifests (`*.gdlproj`). VisionSpec needs the same contract: one manifest declares **root + entry**; the loader walks imports from the entry on disk.

## Decision

Introduce **`.visionproj`** — a line-oriented manifest aligned with `*.gdlproj` (GUIDERS-0051).

### Manifest format (v1)

```text
# optional comment
project <id>
root <logical-path>     # default .
entry <logical-path>    # required — leaf .vision relative to root
document <logical-path> # optional explicit includes (documentation / IDE)
```

| Keyword | Required | Meaning |
|---------|----------|---------|
| `project` | recommended | Stable project id (matches leaf `vision` id when possible) |
| `root` | no (default `.`) | Project root relative to manifest directory |
| `entry` | **yes** | Leaf `.vision` file relative to `root` |
| `document` | no | Explicit pack paths (like gdlproj); v1 loader resolves imports from `entry` — `document` lines are optional metadata |

**Example** (`examples/dashspec-studio.visionproj`):

```text
project dashspec-studio
root .
entry dashspec-studio.vision
```

Physical layout:

```text
examples/
  dashspec-studio.visionproj   # manifest (workspace)
  dashspec-studio.vision       # leaf entry (root .)
  authoring/…                  # imported packs
```

### Resolution

1. Parse manifest → `{ id, root, entry }`
2. `projectRoot = resolve(manifestDir, root)`
3. `composeVisionFile(projectRoot/entry, { projectRoot })` — import graph walk (ADR-0005)
4. Browser player: select project directory containing `.visionproj`; loader auto-detects manifest and normalizes upload paths

### Validation codes

| Code | Rule |
|------|------|
| `V-P001` | Missing `entry` in manifest |
| `V-P002` | Entry file not found under resolved root |
| `V-P003` | No `.visionproj` in browser project selection |

### Player / server

| Endpoint | Use |
|----------|-----|
| `POST /__vision/project` | `{ path: "examples/dashspec-studio.visionproj" }` — repo-relative manifest |
| `POST /__vision/project` | `{ manifestSource, manifestRel, files }` — browser upload after directory pick |

Replace **Open project folder** with **Open project** (directory pick that must contain a `.visionproj`).

## Non-goals

- Unified IDE dispatcher (slnx / csproj / gdlproj / visionproj) — GUIDERS-0062 future
- Cross-repo remote manifests
- Embedding pack bodies inside `.visionproj`

## Consequences

- Examples dropdown prefers `.visionproj` entry
- Single `.vision` open remains for import-free files (e.g. `minimal.vision`)
- ADR-0005 §4 updated: manifest authority supersedes “entry directory = root”

## Implementation checklist

1. [x] Accept ADR-0006
2. [x] `parser/vision-project.js`
3. [x] `examples/dashspec-studio.visionproj`
4. [x] `POST /__vision/project`
5. [x] Player **Open project** UX
6. [x] Tests + `npm test` green
