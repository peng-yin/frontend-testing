import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mutableSource = /^src\/.+\.(?:cjs|mjs|js|jsx|ts|tsx)$/;
const excludedSource =
  /(?:^|\/)(?:__tests__|mocks?|testing|fixtures?)\/|(?:\.d)?\.(?:test|spec|stories|fixture)\.[^.]+$|\.d\.ts$/;

const isMutableSource = (file) =>
  mutableSource.test(file) && !excludedSource.test(file);

const mergeRanges = (ranges) => {
  const merged = [];
  for (const range of [...ranges].sort(
    (left, right) => left.start - right.start,
  )) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
};

export const parseIncrementalMutations = (diff) => {
  const byFile = new Map();
  let currentFile;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      const file = target.startsWith("b/") ? target.slice(2) : undefined;
      currentFile = file && isMutableSource(file) ? file : undefined;
      continue;
    }
    if (!currentFile || !line.startsWith("@@ ")) continue;
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!hunk) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count === 0) continue;
    const ranges = byFile.get(currentFile) ?? [];
    ranges.push({ start, end: start + count - 1 });
    byFile.set(currentFile, ranges);
  }

  return [...byFile.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([file, ranges]) =>
      mergeRanges(ranges).map(({ start, end }) => `${file}:${start}-${end}`),
    );
};

export const createIncrementalConfig = (mutations, outputDirectory) => ({
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker",
  ],
  testRunner: "vitest",
  vitest: { configFile: "vitest.mutation.config.ts", related: true },
  mutate: mutations,
  coverageAnalysis: "perTest",
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  reporters: ["html", "clear-text", "progress", "json"],
  htmlReporter: { fileName: `${outputDirectory}/index.html` },
  jsonReporter: { fileName: `${outputDirectory}/mutation.json` },
  thresholds: { high: 80, low: 60, break: 70 },
  ignoreStatic: true,
  incremental: false,
  cleanTempDir: "always",
  concurrency: process.env.CI ? 2 : 4,
});

export const createMutationSummary = (report) => {
  const counts = {
    killed: 0,
    timedOut: 0,
    survived: 0,
    noCoverage: 0,
  };
  for (const file of Object.values(report.files ?? {})) {
    for (const mutant of file.mutants ?? []) {
      if (mutant.status === "Killed") counts.killed += 1;
      else if (["Timeout", "TimedOut"].includes(mutant.status))
        counts.timedOut += 1;
      else if (mutant.status === "Survived") counts.survived += 1;
      else if (mutant.status === "NoCoverage") counts.noCoverage += 1;
    }
  }
  const detected = counts.killed + counts.timedOut;
  const total = detected + counts.survived + counts.noCoverage;
  const score =
    total === 0 ? "N/A" : `${((detected / total) * 100).toFixed(2)}%`;
  return [
    "## Incremental mutation testing",
    "",
    `Mutation score: **${score}**`,
    "",
    "| Killed | Timeout | Survived | No coverage | Counted |",
    "| ---: | ---: | ---: | ---: | ---: |",
    `| ${counts.killed} | ${counts.timedOut} | ${counts.survived} | ${counts.noCoverage} | ${total} |`,
    "",
  ].join("\n");
};

const readArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const main = () => {
  const base = readArgument("--base");
  const head = readArgument("--head") ?? "HEAD";
  if (!base) {
    console.error(
      "Usage: node scripts/stryker-incremental.mjs --base <ref> [--head <ref>]",
    );
    return 2;
  }

  const output = "artifacts/stryker/incremental";
  mkdirSync(output, { recursive: true });
  const diff = execFileSync(
    "git",
    [
      "diff",
      "--unified=0",
      "--no-color",
      "--diff-filter=ACMR",
      `${base}...${head}`,
      "--",
      "src",
    ],
    { encoding: "utf8" },
  );
  const mutations = parseIncrementalMutations(diff);
  writeFileSync(
    path.join(output, "changed-ranges.json"),
    `${JSON.stringify({ count: mutations.length, mutations }, null, 2)}\n`,
  );

  if (mutations.length === 0) {
    writeFileSync(
      path.join(output, "summary.md"),
      "## Incremental mutation testing\n\nNo changed executable source lines require mutation testing.\n",
    );
    console.log("No changed executable source lines require mutation testing.");
    return 0;
  }

  const configFile = path.join(output, "stryker.config.json");
  writeFileSync(
    configFile,
    `${JSON.stringify(createIncrementalConfig(mutations, output), null, 2)}\n`,
  );
  const stryker = path.resolve(
    "node_modules/@stryker-mutator/core/bin/stryker.js",
  );
  const result = spawnSync(process.execPath, [stryker, "run", configFile], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  const reportFile = path.join(output, "mutation.json");
  const summary = existsSync(reportFile)
    ? createMutationSummary(JSON.parse(readFileSync(reportFile, "utf8")))
    : "## Incremental mutation testing\n\nStryker did not produce a JSON report.\n";
  writeFileSync(path.join(output, "summary.md"), summary);
  return result.status ?? 1;
};

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
