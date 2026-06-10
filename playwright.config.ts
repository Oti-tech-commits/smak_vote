import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: 'retain-on-failure'
  }
});
