import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://127.0.0.1:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
