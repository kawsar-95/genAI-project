import { defineConfig, devices } from '@playwright/test';

/** `SUITE` (smoke | regression) only decides where the HTML report is written. */
const suite = process.env.SUITE ?? 'regression';

export default defineConfig({
  testDir: './tests',
  // The journey is one ordered flow (register -> activate -> fund -> transact -> reset), so no parallelism.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${suite}`, open: 'never' }],
  ],
  use: {
    baseURL: 'https://dmoneyportal.roadtocareer.net',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 250) },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
