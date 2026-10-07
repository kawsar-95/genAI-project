import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { authFile } from './e2e/utils/session';

// Test secrets (GMAIL_ACCESS_TOKEN, optional AGENT_EMAIL/AGENT_PASSWORD) live in e2e/.env (gitignored).
const e2eEnv = path.join(__dirname, 'e2e', '.env');
if (fs.existsSync(e2eEnv)) process.loadEnvFile(e2eEnv);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // One session per role. Each <role>-setup logs in (skipped while the saved session is still valid)
  // and saves cookie + localStorage to e2e/<role>_auth.json; specs in e2e/tests/<role>/ start with it.
  projects: [
    { name: 'admin-setup', testMatch: /admin\.setup\.ts/ },
    { name: 'agent-setup', testMatch: /agent\.setup\.ts/ },
    {
      name: 'admin',
      testMatch: /tests\/admin\/.*\.spec\.ts/,
      dependencies: ['admin-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFile('admin') },
    },
    {
      name: 'agent',
      testMatch: /tests\/agent\/.*\.spec\.ts/,
      dependencies: ['agent-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFile('agent') },
    },
  ],
  // Reuses servers that are already running; otherwise starts them.
  webServer: [
    {
      command: 'npm start',
      cwd: '../dmoney-transaction-api',
      url: 'http://localhost:5000/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
