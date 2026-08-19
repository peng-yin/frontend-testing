import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  mergeCoverageMaps,
  normalizeCoveragePaths,
  writeCoverageReports,
} from "./e2e-coverage.mjs";

const location = (line) => ({
  start: { line, column: 0 },
  end: { line, column: 1 },
});
const fileCoverage = (file, hits = 1) => ({
  path: file,
  statementMap: { 0: location(1) },
  fnMap: {
    0: { name: "example", decl: location(1), loc: location(1), line: 1 },
  },
  branchMap: {
    0: {
      type: "if",
      line: 1,
      loc: location(1),
      locations: [location(1), location(1)],
    },
  },
  s: { 0: hits },
  f: { 0: hits },
  b: { 0: [hits, 0] },
});

test("merges worker coverage counters", () => {
  const file = "/repo/src/example.ts";
  const merged = mergeCoverageMaps([
    { [file]: fileCoverage(file, 1) },
    { [file]: fileCoverage(file, 2) },
  ]);
  assert.equal(merged[file].s[0], 3);
  assert.equal(merged[file].f[0], 3);
  assert.deepEqual(merged[file].b[0], [3, 0]);
});

test("normalizes instrumented source paths and writes portable reports", (context) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "blueprint-e2e-coverage-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "src/example.ts");
  mkdirSync(path.dirname(source), { recursive: true });
  writeFileSync(source, "export const example = true;\n");

  const normalized = normalizeCoveragePaths(
    {
      ["/runner/work/project/src/example.ts"]: fileCoverage(
        "/runner/work/project/src/example.ts",
      ),
    },
    root,
  );
  assert.deepEqual(Object.keys(normalized), [source]);

  const output = path.join(root, "artifacts/report");
  const files = writeCoverageReports(normalized, {
    repositoryRoot: root,
    outputDirectory: output,
  });
  assert.deepEqual(files, ["src/example.ts"]);
  for (const report of [
    "coverage-final.json",
    "coverage-summary.json",
    "cobertura-coverage.xml",
    "lcov.info",
    "html/index.html",
    "covered-files.txt",
  ]) {
    assert.ok(readFileSync(path.join(output, report)).length > 0, report);
  }
});
