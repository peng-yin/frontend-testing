import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createCoverageMap } = require("istanbul-lib-coverage");
const { createContext } = require("istanbul-lib-report");
const reports = require("istanbul-reports");
const sourcePattern = /(?:^|\/)(src\/.+\.(?:cjs|mjs|js|jsx|ts|tsx))$/;

export const mergeCoverageMaps = (coverageMaps) => {
  const merged = createCoverageMap({});
  for (const coverage of coverageMaps) merged.merge(coverage);
  return Object.fromEntries(
    merged.files().map((file) => [file, merged.fileCoverageFor(file).toJSON()]),
  );
};

export const normalizeCoveragePaths = (coverage, repositoryRoot) => {
  const normalized = [];
  for (const [coveragePath, fileCoverage] of Object.entries(coverage)) {
    const cleanPath = decodeURIComponent(coveragePath)
      .replace(/^file:\/\//, "")
      .split("?")[0]
      .replaceAll("\\", "/");
    const match = cleanPath.match(sourcePattern);
    if (!match) continue;
    const file = path.resolve(repositoryRoot, match[1]);
    normalized.push({ [file]: { ...fileCoverage, path: file } });
  }
  return mergeCoverageMaps(normalized);
};

const executeReport = (coverageMap, directory, reporter, options = {}) => {
  mkdirSync(directory, { recursive: true });
  reports
    .create(reporter, options)
    .execute(createContext({ dir: directory, coverageMap }));
};

export const writeCoverageReports = (
  coverage,
  { repositoryRoot, outputDirectory },
) => {
  const coverageMap = createCoverageMap(coverage);
  if (coverageMap.files().length === 0) {
    throw new Error("No Playwright E2E coverage was collected.");
  }

  const invalid = coverageMap.files().filter((file) => {
    const relative = path.relative(repositoryRoot, file);
    return (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    );
  });
  if (invalid.length > 0) {
    throw new Error(
      `Coverage contains invalid source paths:\n${invalid.join("\n")}`,
    );
  }

  rmSync(outputDirectory, { recursive: true, force: true });
  executeReport(coverageMap, outputDirectory, "json", {
    file: "coverage-final.json",
  });
  executeReport(coverageMap, outputDirectory, "json-summary", {
    file: "coverage-summary.json",
  });
  executeReport(coverageMap, outputDirectory, "lcovonly", {
    file: "lcov.info",
  });
  executeReport(coverageMap, outputDirectory, "cobertura", {
    file: "cobertura-coverage.xml",
    projectRoot: repositoryRoot,
  });
  executeReport(coverageMap, path.join(outputDirectory, "html"), "html", {
    projectRoot: repositoryRoot,
  });

  const coveredFiles = coverageMap
    .files()
    .map((file) => path.relative(repositoryRoot, file).replaceAll("\\", "/"))
    .sort();
  writeFileSync(
    path.join(outputDirectory, "covered-files.txt"),
    `${coveredFiles.join("\n")}\n`,
  );
  return coveredFiles;
};

export const cleanCoverageWorkspace = (repositoryRoot) => {
  rmSync(path.join(repositoryRoot, "artifacts/e2e-coverage"), {
    recursive: true,
    force: true,
  });
};

export const generateCoverageReports = (repositoryRoot) => {
  const rawDirectory = path.join(repositoryRoot, "artifacts/e2e-coverage/raw");
  const shards = existsSync(rawDirectory)
    ? readdirSync(rawDirectory)
        .filter((file) => file.endsWith(".json"))
        .sort()
    : [];
  if (shards.length === 0) {
    throw new Error(`No E2E coverage shards found in ${rawDirectory}`);
  }

  const coverage = shards.map((file) =>
    JSON.parse(readFileSync(path.join(rawDirectory, file), "utf8")),
  );
  const normalized = normalizeCoveragePaths(
    mergeCoverageMaps(coverage),
    repositoryRoot,
  );
  const outputDirectory = path.join(
    repositoryRoot,
    "artifacts/e2e-coverage/report",
  );
  const files = writeCoverageReports(normalized, {
    repositoryRoot,
    outputDirectory,
  });
  const summary = JSON.parse(
    readFileSync(path.join(outputDirectory, "coverage-summary.json"), "utf8"),
  ).total;
  console.log(
    JSON.stringify({ shards: shards.length, files: files.length, ...summary }),
  );
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2];
  const root = process.cwd();
  if (command === "clean") cleanCoverageWorkspace(root);
  else if (command === "report") generateCoverageReports(root);
  else {
    console.error("Usage: node scripts/e2e-coverage.mjs <clean|report>");
    process.exitCode = 2;
  }
}
