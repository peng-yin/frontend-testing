import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "storybook-smoke.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : "50%",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: "artifacts/playwright-results",
  reporter: isCI
    ? [
        ["github"],
        [
          "html",
          { outputFolder: "artifacts/playwright-report", open: "never" },
        ],
        ["json", { outputFile: "artifacts/playwright-results/results.json" }],
        ["junit", { outputFile: "artifacts/playwright-results/junit.xml" }],
      ]
    : [["list"], ["html", { outputFolder: "artifacts/playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: isCI
      ? "pnpm preview --host 127.0.0.1 --port 4173"
      : "pnpm build && pnpm preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
