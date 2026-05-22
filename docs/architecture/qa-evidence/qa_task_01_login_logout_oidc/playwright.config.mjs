import { createRequire } from 'node:module';

const frontendRequire = createRequire(new URL('../../../../frontend/package.json', import.meta.url));
const { defineConfig, devices } = frontendRequire('@playwright/test');

export default defineConfig({
  testDir: '.',
  testMatch: /qa_task_01_login_logout_oidc\.spec\.mjs/,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: './videos',
  use: {
    baseURL: process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
