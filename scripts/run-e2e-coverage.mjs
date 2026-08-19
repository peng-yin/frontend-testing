import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(process.execPath, ["scripts/e2e-coverage.mjs", "clean"]);
const coverageEnvironment = {
  ...process.env,
  CI: "1",
  TEST_E2E_COVERAGE: "1",
};
run(pnpm, ["build"], coverageEnvironment);
run(
  pnpm,
  ["exec", "playwright", "test", "--project=chromium"],
  coverageEnvironment,
);
run(process.execPath, ["scripts/e2e-coverage.mjs", "report"]);
