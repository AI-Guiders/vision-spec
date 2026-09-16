import test from "node:test";
import assert from "node:assert/strict";
import { parseReadinessFixtureLines } from "./environment-readiness-page.js";

test("parse legacy connector/schema fixture lines into readiness rows", () => {
  const rows = parseReadinessFixtureLines([
    "  connector: demo-db",
    "  schema: reports / cards / binds",
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "connector");
  assert.equal(rows[0].level, "ok");
  assert.equal(rows[1].title, "Schema");
});

test("parse explicit readiness pipe rows", () => {
  const rows = parseReadinessFixtureLines([
    "readiness | connector | Connector | demo-db | caution",
  ]);
  assert.equal(rows[0].level, "caution");
});
