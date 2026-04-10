import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    headless: true,
  },
  outputDir: '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_04_obter-iswc/videos/',
});
