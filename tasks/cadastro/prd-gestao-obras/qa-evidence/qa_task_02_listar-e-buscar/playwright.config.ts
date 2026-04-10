import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'ui.spec.ts',
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  outputDir: './videos/',
  reporter: [['list'], ['json', { outputFile: './playwright-results.json' }]],
});
