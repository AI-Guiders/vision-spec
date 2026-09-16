import test from "node:test";
import assert from "node:assert/strict";
import {
  forwardStackGridStyle,
  forwardBodyStyle,
  mfdRowStyle,
  zonePlacementStyle,
} from "../plugins/aiguiders-mental-model/deck-layout.js";

test("forward stack rows from deck IR: primary + dock auto", () => {
  const withDock = forwardStackGridStyle({ forward: ["editor"], forwardDock: "data-lab" });
  assert.equal(withDock.gridTemplateRows, "minmax(0, 1fr) auto");
  const solo = forwardStackGridStyle({ forward: ["editor"], forwardDock: null });
  assert.equal(solo.gridTemplateRows, "minmax(0, 1fr)");
});

test("forward body grid columns follow forward zone count", () => {
  const one = forwardBodyStyle({ forward: ["editor"] });
  assert.equal(one.display, "flex");
  const two = forwardBodyStyle({ forward: ["editor", "report-preview"] });
  assert.match(two.gridTemplateColumns, /repeat\(2, minmax\(0, 1fr\)\)/);
});

test("mfd row split when split zone is not a tab zone", () => {
  const split = mfdRowStyle({ mfdSplit: "resolve" }, [
    { tab: "Project", zone: "spec-tree" },
    { tab: "SQL", zone: "data-lab" },
  ]);
  assert.equal(split.gridTemplateColumns, "minmax(0, 1fr) auto");
  const noSplit = mfdRowStyle({ mfdSplit: "spec-tree" }, [{ tab: "Project", zone: "spec-tree" }]);
  assert.equal(noSplit.display, "flex");
});

test("zone placement styles are band-specific", () => {
  assert.equal(zonePlacementStyle("forward-dock").flex, undefined);
  assert.equal(zonePlacementStyle("forward").flex, "1 1 0");
});
