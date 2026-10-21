import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
// Point the suite at a deployed site instead of a local build: E2E_BASE_URL=https://... npm run test:e2e
const DEPLOYED_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: DEPLOYED_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // Use an installed browser instead of downloading one: PW_CHANNEL=chrome npm run test:e2e
    channel: process.env.PW_CHANNEL,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],
  // Locally, tests run against the production build, served like the Docker image does.
  webServer: DEPLOYED_URL
    ? undefined
    : {
        command: "npm run build && npm start",
        env: { PORT: String(PORT) },
        url: `http://localhost:${PORT}/en`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
