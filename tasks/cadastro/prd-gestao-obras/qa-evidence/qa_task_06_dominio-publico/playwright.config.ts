import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    headless: true,
  },
  outputDir: '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_06_dominio-publico/videos/',
  reporter: [['list']],
});
