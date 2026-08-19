import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import istanbul from "vite-plugin-istanbul";

const collectE2ECoverage = process.env.TEST_E2E_COVERAGE === "1";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "./",
  plugins: [
    react(),
    ...(collectE2ECoverage
      ? [
          istanbul({
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
              "src/**/*.{test,spec,stories}.{ts,tsx}",
              "src/**/*.d.ts",
              "src/mocks/**",
            ],
            forceBuildInstrument: true,
          }),
        ]
      : []),
  ],
});
