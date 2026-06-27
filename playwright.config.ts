import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  retries: 1,
webServer: {
    command: 'npm.cmd run dev -- -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: 'retain-on-failure'
  }
});
