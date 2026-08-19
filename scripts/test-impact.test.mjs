import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { analyzeImpact, parseDiffArguments } from "./test-impact.mjs";

const policy = {
  version: 1,
  planPattern: ".testing/plans/*.json",
  requireChangedEvidence: true,
  ignored: ["**/*.md"],
  rules: [
    {
      id: "component",
      include: ["src/components/**/*.tsx"],
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"],
      required: ["unit", "storybook", "mutation"],
    },
    {
      id: "api",
      include: ["src/api/**/*.ts"],
      exclude: ["**/*.test.ts"],
      required: ["unit", "mutation"],
    },
    {
      id: "critical-flow",
      include: ["src/pages/**/*.tsx", "src/routes/**/*.tsx"],
      exclude: ["**/*.test.tsx", "**/*.stories.tsx"],
      required: ["unit", "storybook", "e2e"],
    },
    {
      id: "visual-style",
      include: ["src/**/*.css"],
      exclude: [],
      required: ["storybook"],
    },
  ],
  evidencePatterns: {
    unit: ["**/*.test.ts", "**/*.test.tsx"],
    storybook: ["**/*.stories.ts", "**/*.stories.tsx"],
    mutation: ["**/*.test.ts", "**/*.test.tsx"],
    e2e: ["e2e/**/*.spec.ts"],
  },
};

function fixture({
  source,
  requiredTests,
  evidence,
  commands = ["pnpm verify"],
}) {
  const root = mkdtempSync(join(tmpdir(), "test-impact-"));
  for (const file of [...source, ...Object.values(evidence).flat()]) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, "");
  }
  const planPath = ".testing/plans/change.json";
  mkdirSync(join(root, ".testing/plans"), { recursive: true });
  writeFileSync(
    join(root, planPath),
    JSON.stringify({
      version: 1,
      change_id: "change",
      summary: "test",
      behaviors: [
        {
          id: "behavior",
          description: "behavior",
          risk: "high",
          source,
          required_tests: requiredTests,
          evidence,
          commands,
        },
      ],
    }),
  );
  return { root, planPath };
}

test("documentation-only changes pass without a plan", () => {
  const result = analyzeImpact({
    root: "/",
    changedFiles: ["README.md"],
    policy,
  });
  assert.equal(result.ok, true);
});

test("accepts the argument separator forwarded by pnpm", () => {
  assert.deepEqual(parseDiffArguments(["--", "--working-tree"]), {
    changedFiles: [],
    workingTree: true,
  });
});

test("component changes fail without a plan", () => {
  const result = analyzeImpact({
    root: "/",
    changedFiles: ["src/components/Button.tsx"],
    policy,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Changed test plan required/);
});

test("complete component evidence passes", () => {
  const source = ["src/components/Button.tsx"];
  const evidence = {
    unit: ["src/components/Button.test.tsx"],
    storybook: ["src/components/Button.stories.tsx"],
    mutation: ["src/components/Button.test.tsx"],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: true, mutation: true, e2e: false },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [
      planPath,
      ...source,
      ...new Set(Object.values(evidence).flat()),
    ],
    policy,
  });
  assert.deepEqual(result.errors, []);
});

test("missing Storybook evidence fails", () => {
  const source = ["src/components/Button.tsx"];
  const evidence = {
    unit: ["src/components/Button.test.tsx"],
    storybook: [],
    mutation: ["src/components/Button.test.tsx"],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: true, mutation: true, e2e: false },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [planPath, ...source, ...evidence.unit],
    policy,
  });
  assert.match(result.errors.join("\n"), /storybook evidence is required/);
});

test("API unit evidence can also prove mutation behavior", () => {
  const source = ["src/api/users.ts"];
  const evidence = {
    unit: ["src/api/users.test.ts"],
    storybook: [],
    mutation: ["src/api/users.test.ts"],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: false, mutation: true, e2e: false },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [planPath, ...source, ...evidence.unit],
    policy,
  });
  assert.equal(result.ok, true);
});

test("critical flows require unit, Storybook and E2E evidence", () => {
  const source = ["src/pages/Checkout.tsx"];
  const evidence = {
    unit: ["src/pages/Checkout.test.tsx"],
    storybook: ["src/pages/Checkout.stories.tsx"],
    mutation: [],
    e2e: ["e2e/checkout.spec.ts"],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: true, mutation: false, e2e: true },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [
      planPath,
      ...source,
      ...new Set(Object.values(evidence).flat()),
    ],
    policy,
  });
  assert.deepEqual(result.errors, []);
});

test("critical flows fail when E2E evidence is missing", () => {
  const source = ["src/routes/Account.tsx"];
  const evidence = {
    unit: ["src/routes/Account.test.tsx"],
    storybook: ["src/routes/Account.stories.tsx"],
    mutation: [],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: true, mutation: false, e2e: true },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [
      planPath,
      ...source,
      ...new Set(Object.values(evidence).flat()),
    ],
    policy,
  });
  assert.match(result.errors.join("\n"), /e2e evidence is required/);
});

test("style-only changes require Storybook but not unit or E2E", () => {
  const source = ["src/components/Card.css"];
  const evidence = {
    unit: [],
    storybook: ["src/components/Card.stories.tsx"],
    mutation: [],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: {
      unit: false,
      storybook: true,
      mutation: false,
      e2e: false,
    },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [planPath, ...source, ...evidence.storybook],
    policy,
  });
  assert.equal(result.ok, true);
});

test("unsafe evidence paths are rejected", () => {
  const source = ["src/api/users.ts"];
  const evidence = {
    unit: ["../users.test.ts"],
    storybook: [],
    mutation: ["../users.test.ts"],
    e2e: [],
  };
  const { root, planPath } = fixture({
    source,
    requiredTests: { unit: true, storybook: false, mutation: true, e2e: false },
    evidence,
  });
  const result = analyzeImpact({
    root,
    changedFiles: [planPath, ...source],
    policy,
  });
  assert.match(result.errors.join("\n"), /Unsafe repository path/);
});
