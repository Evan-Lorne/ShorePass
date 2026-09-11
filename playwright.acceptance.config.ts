import { defineConfig, devices } from "@playwright/test";

// Playwright forces color in its workers and web server. Do not pass Node both
// FORCE_COLOR and an inherited NO_COLOR, which emits a warning in every child.
delete process.env.NO_COLOR;

if (
  process.platform === "darwin" &&
  process.env.CODEX_SANDBOX === "seatbelt" &&
  !process.argv.includes("--list")
) {
  throw new Error(
    "Playwright browser tests cannot run inside CODEX_SANDBOX because Chromium aborts during macOS app registration. Re-run the command outside the restricted sandbox.",
  );
}

const defaultPort = 32000 + (process.pid % 1000);
const baseURL = process.env.ACCEPTANCE_URL || `http://127.0.0.1:${defaultPort}`;
const serverUrl = new URL(baseURL);
const databaseUrl =
  process.env.ACCEPTANCE_DATABASE_URL || `file:/tmp/shorepass-acceptance-${serverUrl.port}.db`;

process.env.ACCEPTANCE_URL = baseURL;
process.env.DATABASE_URL = databaseUrl;
process.env.APP_ORIGIN = baseURL;
process.env.COOKIE_SECURE = "false";
process.env.NEXT_DIST_DIR = ".next-acceptance";

export default defineConfig({
  testDir: "./acceptance",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "acceptance-report", open: "never" }]],
  webServer: {
    command:
      `RUST_LOG=info npx prisma db push --skip-generate && npx tsx src/scripts/seed-acceptance.ts && npm run build && npm run start -- --hostname ${serverUrl.hostname} --port ${serverUrl.port}`,
    url: baseURL,
    timeout: 180000,
    reuseExistingServer: false,
  },
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
