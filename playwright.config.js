import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    baseURL: process.env.LIVE_URL || 'http://127.0.0.1:4173/nc-trout-stocking/',
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: 'retain-on-failure'
  },
  webServer: process.env.LIVE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/nc-trout-stocking/',
    reuseExistingServer: !process.env.CI
  }
});
