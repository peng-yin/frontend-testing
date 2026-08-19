import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "storybook-smoke.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : "50%",
  timeout: 30_000,
  outputDir: "artifacts/storybook-smoke/results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/storybook-smoke/html", open: "never" }],
    ["json", { outputFile: "artifacts/storybook-smoke/results.json" }],
    ["junit", { outputFile: "artifacts/storybook-smoke/junit.xml" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:6099",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/static-server.mjs storybook-static 6099",
    url: "http://127.0.0.1:6099/index.json",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
