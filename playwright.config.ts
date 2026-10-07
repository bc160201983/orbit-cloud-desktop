import { defineConfig } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
const dataDir = (process.env.ORBIT_TEST_DATA_DIR ??= mkdtempSync(
  `${tmpdir()}/orbit-browser-test-`,
));
process.env.ORBIT_TEST_SETUP_TOKEN ??= randomBytes(32).toString("hex");
process.env.ORBIT_TEST_DATA_DIR = dataDir;
export default defineConfig({
  testDir: "./tests",
  testMatch: "cloud.spec.ts",
  workers: 1,
  timeout: 45000,
  globalTeardown: "./tests/teardown.mjs",
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command: "node server/index.mjs",
      url: "http://127.0.0.1:3197/api/health",
      env: {
        PORT: "3197",
        HOST: "127.0.0.1",
        ORBIT_DATA_DIR: dataDir,
        ORBIT_SETUP_TOKEN: process.env.ORBIT_TEST_SETUP_TOKEN,
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:web -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: { ORBIT_API_TARGET: "http://127.0.0.1:3197" },
      reuseExistingServer: false,
    },
  ],
});
