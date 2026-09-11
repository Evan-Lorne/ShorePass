import { defineConfig, devices } from '@playwright/test';

// Playwright forces color in its workers and web server. Do not pass Node both
// FORCE_COLOR and an inherited NO_COLOR, which emits a warning in every child.
delete process.env.NO_COLOR;

if (
  process.platform === 'darwin' &&
  process.env.CODEX_SANDBOX === 'seatbelt' &&
  !process.argv.includes('--list')
) {
  throw new Error(
    'Playwright browser tests cannot run inside CODEX_SANDBOX because Chromium aborts during macOS app registration. Re-run the command outside the restricted sandbox.',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    }
  ]
});
