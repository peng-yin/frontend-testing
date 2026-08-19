import assert from "node:assert/strict";
import test from "node:test";
import {
  createIncrementalConfig,
  createMutationSummary,
  parseIncrementalMutations,
} from "./stryker-incremental.mjs";

test("maps changed source hunks to merged Stryker ranges", () => {
  const diff = [
    "+++ b/src/components/Profile.tsx",
    "@@ -4,0 +5,2 @@",
    "@@ -7,1 +7,3 @@",
    "+++ b/src/components/Profile.test.tsx",
    "@@ -1,0 +1,20 @@",
    "+++ b/src/mocks/handlers.ts",
    "@@ -1,0 +1,4 @@",
    "+++ b/README.md",
    "@@ -1,0 +1,1 @@",
  ].join("\n");

  assert.deepEqual(parseIncrementalMutations(diff), [
    "src/components/Profile.tsx:5-9",
  ]);
});

test("builds a thresholded related-test Stryker configuration", () => {
  const config = createIncrementalConfig(
    ["src/api/users.ts:3-8"],
    "artifacts/example",
  );
  assert.deepEqual(config.mutate, ["src/api/users.ts:3-8"]);
  assert.equal(config.vitest.related, true);
  assert.equal(config.thresholds.break, 70);
  assert.equal(config.incremental, false);
});

test("summarizes mutation evidence for the CI job summary", () => {
  const summary = createMutationSummary({
    files: {
      "src/api/users.ts": {
        mutants: [
          { status: "Killed" },
          { status: "Timeout" },
          { status: "Survived" },
          { status: "NoCoverage" },
        ],
      },
    },
  });
  assert.match(summary, /Mutation score: \*\*50\.00%\*\*/);
  assert.match(summary, /\| 1 \| 1 \| 1 \| 1 \| 4 \|/);
});
