import test from "node:test";
import assert from "node:assert/strict";
import { parseIconRef } from "./icon-ref.js";
import { parseFixtureBody } from "./fixture-parse.js";

test("parseIconRef resolves library shorthand and explicit refs", () => {
  assert.deepEqual(parseIconRef("folder"), { library: "codicons", iconId: "folder" });
  assert.deepEqual(parseIconRef("seti/js", "codicons"), { library: "seti", iconId: "js" });
  assert.deepEqual(parseIconRef("codicons/database", "codicons"), {
    library: "codicons",
    iconId: "database",
  });
});

test("parseFixtureBody parses typed tree fixtures", () => {
  const body = [
    "  folder planet-repo",
    "    file report.dashspec dashspec",
    "    folder libraries",
    "      file filters.dashlibrary dashlibrary",
  ];
  const fixture = parseFixtureBody(body);
  assert.equal(fixture.type, "tree");
  assert.equal(fixture.nodes[0].kind, "folder");
  assert.equal(fixture.nodes[0].name, "planet-repo");
  assert.equal(fixture.nodes[0].children[0].kind, "file");
  assert.equal(fixture.nodes[0].children[0].artifactKind, "dashspec");
});

test("parseFixtureBody parses layout-board fixtures", () => {
  const fixture = parseFixtureBody([
    "columns 12",
    'card Q peak "Peak by app"',
    "card W util Util summary",
    "row Q W",
    "row E",
  ]);
  assert.equal(fixture.type, "layout-board");
  assert.equal(fixture.columns, 12);
  assert.equal(fixture.cards.Q.label, "Peak by app");
  assert.deepEqual(fixture.rows, [["Q", "W"], ["E"]]);
});

test("parseFixtureBody parses keyline fixtures", () => {
  const fixture = parseFixtureBody(["connector demo-db", "repl SELECT 1"]);
  assert.equal(fixture.type, "keylines");
  assert.deepEqual(fixture.lines, ["connector demo-db", "repl SELECT 1"]);
});
