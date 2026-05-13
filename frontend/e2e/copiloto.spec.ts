import { test } from '@playwright/test';

test.describe('Copiloto Operacional', () => {
  test.skip(
    'fluxo autenticado do Copiloto',
    async () => {
      // Requires local Logto/auth session plus BFF and ai-orchestrator running.
      // The implementation is covered by component tests and backend contract tests;
      // this placeholder documents the intended E2E entrypoint for environments
      // where authenticated browser setup is available.
    },
  );
});
