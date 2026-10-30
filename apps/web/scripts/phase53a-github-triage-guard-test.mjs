import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  classifyUnambiguousGitHubActivity,
  narrowGitHubDirection,
} from "../lib/github/decision-triage.ts";

const fixtures = JSON.parse(
  readFileSync(path.join(process.cwd(), "scripts/phase53a-github-triage-fixtures.json"), "utf8"),
);

let guarded = 0;
for (const fixture of fixtures) {
  const source = fixture.observation;
  const result = classifyUnambiguousGitHubActivity(source);
  if (result) {
    guarded += 1;
    assert.ok(
      fixture.expectedClassification.includes(result.classification),
      `Conservative classification mismatch for ${fixture.id}`,
    );
    assert.ok(result.reason && result.reason.length <= 280);
    assert.equal(
      ["decision_candidate", "direction_change"].includes(result.classification),
      false,
      `Unambiguous guard unexpectedly promotes ${fixture.id}`,
    );
  }

  const narrowed = narrowGitHubDirection(source, "direction_change");
  if (fixture.group === "critical_promote") {
    assert.equal(narrowed, "decision_candidate", `Overstated direction: ${fixture.id}`);
  }
  if (fixture.group === "direction_change") {
    assert.equal(narrowed, "direction_change", `Lost real direction change: ${fixture.id}`);
  }
  assert.equal(narrowGitHubDirection(source, "note"), "note");
  assert.equal(narrowGitHubDirection(source, "insufficient"), "insufficient");
}
assert.equal(fixtures.length, 51);
assert.ok(guarded >= 1);
console.log(`PHASE_53A_SOURCE_GUARD = PASS (${guarded} guarded, ${fixtures.length} checked)`);
console.log("PHASE_53A_DIRECTION_SCOPE = PASS");
