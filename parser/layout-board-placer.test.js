import test from "node:test";
import assert from "node:assert/strict";
import { rowPlacements, formatBracketBoard, unplacedRefs } from "../player/layout-board-placer.js";

test("row placements equal-split columns", () => {
  const p = rowPlacements(["Q", "W"], 12, 1);
  assert.deepEqual(p, [
    { ref: "Q", row: 1, col: 1, span: 6 },
    { ref: "W", row: 1, col: 7, span: 6 },
  ]);
});

test("formatBracketBoard matches dashlayout rows", () => {
  assert.equal(formatBracketBoard([["Q", "W"], ["E"]]), "[ Q W ]\n[ E ]");
});

test("unplacedRefs lists cards not on board", () => {
  const cards = { Q: {}, W: {}, R: {} };
  assert.deepEqual(unplacedRefs(cards, [["Q", "W"]]), ["R"]);
});
