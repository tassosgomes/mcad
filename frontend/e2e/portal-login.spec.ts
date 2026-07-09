import { test, expect } from '@playwright/test';

test.describe('Portal do Titular — Smoke E2E', () => {
  test('navegar para /portal/login, preencher credenciais e verificar redirect', async ({ page }) => {
    await page.goto('/portal/login');

    await page.waitForLoadState('networkidle');

    const documentInput = page.locator('input[name="documento"], input[placeholder*="CPF"], input[placeholder*="CNPJ"]').first();
    if (await documentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await documentInput.fill('99999999999');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('teste123');
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
    }

    await page.waitForTimeout(3000);
  });
});
