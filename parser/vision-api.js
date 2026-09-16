/**
 * VisionSpec parser public API (single import surface).
 *
 * Federation layers (do not merge modules — vision-project imports vision-compose):
 * - ADR-0005 compose: import graph + merge → flat VisionDocument IR
 * - ADR-0006 project: .visionproj manifest → composeVisionProject
 *
 * Tooling, REPL, and agents SHOULD import from this file only:
 *   import { composeVisionProject, composeVisionFile } from "./parser/vision-api.js";
 */

export {
  composeVision,
  composeVisionFile,
  composeVisionFromMap,
  detectLeafEntry,
  expandLogicalPattern,
  readVisionProjectMap,
} from "./vision-compose.js";

export {
  composeVisionProject,
  composeVisionProjectFromUpload,
  normalizeVisionProjectUpload,
  parseVisionProject,
  resolveVisionProjectRoot,
  selectVisionProjectManifest,
} from "./vision-project.js";

export { entryScreen, parseVision, parseVisionFragment, parseVisionLeaf } from "./vision-parser.js";
