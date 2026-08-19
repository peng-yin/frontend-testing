import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test as base } from "@playwright/test";

type FileCoverage = {
  path: string;
  statementMap: Record<string, unknown>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, unknown>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
};
type IstanbulCoverage = Record<string, FileCoverage>;

const enabled = process.env.TEST_E2E_COVERAGE === "1";

const mergeCounters = (
  target: Record<string, number>,
  source: Record<string, number>,
) => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
};

const mergeBranches = (
  target: Record<string, number[]>,
  source: Record<string, number[]>,
) => {
  for (const [key, values] of Object.entries(source)) {
    const current = target[key] ?? [];
    target[key] = values.map((value, index) => value + (current[index] ?? 0));
  }
};

const mergeCoverage = (target: IstanbulCoverage, source: IstanbulCoverage) => {
  for (const [file, coverage] of Object.entries(source)) {
    if (!target[file]) {
      target[file] = coverage;
      continue;
    }
    mergeCounters(target[file].s, coverage.s);
    mergeCounters(target[file].f, coverage.f);
    mergeBranches(target[file].b, coverage.b);
  }
};

export const test = base.extend<
  { collectE2ECoverage: void },
  { workerCoverage: IstanbulCoverage }
>({
  workerCoverage: [
    async ({ browserName }, use, workerInfo) => {
      const coverage: IstanbulCoverage = {};
      await use(coverage);
      if (!enabled || Object.keys(coverage).length === 0) return;

      const directory = path.resolve("artifacts/e2e-coverage/raw");
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        path.join(
          directory,
          `worker-${browserName}-${workerInfo.workerIndex}-${process.pid}.json`,
        ),
        JSON.stringify(coverage),
      );
    },
    { scope: "worker" },
  ],
  collectE2ECoverage: [
    async ({ page, workerCoverage }, use) => {
      await use();
      if (!enabled || page.isClosed()) return;

      const serializedCoverage: string | undefined = await page.evaluate(() => {
        const coverage: unknown = (
          globalThis as unknown as { __coverage__?: unknown }
        ).__coverage__;
        return coverage ? JSON.stringify(coverage) : undefined;
      });
      if (serializedCoverage) {
        const coverage: unknown = JSON.parse(serializedCoverage);
        mergeCoverage(workerCoverage, coverage as IstanbulCoverage);
      }
    },
    { auto: true },
  ],
});

export { expect };
