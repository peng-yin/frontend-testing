import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "artifacts/unit");
const vitest = path.join(root, "node_modules/vitest/vitest.mjs");

mkdirSync(output, { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    vitest,
    "run",
    "--project",
    "unit",
    "--coverage",
    "--coverage.reportOnFailure",
    "--coverage.reportsDirectory",
    "artifacts/unit/coverage",
    "--coverage.reporter",
    "text",
    "--coverage.reporter",
    "json",
    "--coverage.reporter",
    "json-summary",
    "--coverage.reporter",
    "cobertura",
    "--coverage.reporter",
    "lcov",
    "--coverage.reporter",
    "html",
    "--reporter",
    "default",
    "--reporter",
    "html",
    "--reporter",
    "json",
    "--reporter",
    "junit",
    "--outputFile.html",
    "artifacts/unit/index.html",
    "--outputFile.json",
    "artifacts/unit/unit-result.json",
    "--outputFile.junit",
    "artifacts/unit/junit.xml",
    ...process.argv.slice(2),
  ],
  { cwd: root, env: process.env, stdio: "inherit" },
);

const requiredReports = [
  "index.html",
  "unit-result.json",
  "junit.xml",
  "coverage/cobertura-coverage.xml",
  "coverage/coverage-summary.json",
  "coverage/index.html",
  "coverage/lcov.info",
];
const missingReports = requiredReports.filter((report) => {
  const file = path.join(output, report);
  return !existsSync(file) || statSync(file).size === 0;
});

if (missingReports.length > 0) {
  console.error(`Missing CI unit reports:\n${missingReports.join("\n")}`);
}
if (result.error) console.error(result.error);

process.exitCode = result.status || (missingReports.length > 0 ? 1 : 0);
