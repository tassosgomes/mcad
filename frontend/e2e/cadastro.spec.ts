import { test, expect, Browser } from '@playwright/test';
import { loginWithLogto } from './logto-login';

const ANALISTA_USER = 'analista_cadastro';
const ANALISTA_PASS = 'Analista123!';

// Cada teste recebe seu próprio browser context (sessão isolada)
// para evitar que o login do teste anterior interfira.
test.describe('Cadastro — autenticação e listagem de obras', () => {

  test('login com Logto e acesso à lista de obras retorna HTTP 200', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const apiResponses: { url: string; status: number }[] = [];
      page.on('response', res => {
        if (res.url().includes('/api/v1/obras')) {
          apiResponses.push({ url: res.url(), status: res.status() });
        }
      });

      // 1. Acessa raiz — redireciona para Logto
      await page.goto('http://localhost:5173/');
      await expect(page).toHaveURL(/logto\.app/, { timeout: 15_000 });

      // 2. Login via Logto
      await loginWithLogto(page, ANALISTA_USER, ANALISTA_PASS);

      // 3. Navega para obras
      await page.goto('http://localhost:5173/cadastro/obras');

      // 4. Aguarda página carregar
      const obrasPageLocator = page.locator('h1, table, [class*="emptyState"], [class*="ObrasPage"]');
      await obrasPageLocator.first().waitFor({ state: 'visible', timeout: 15_000 });

      // 5. Aguarda queries assíncronas
      await page.waitForTimeout(2_000);

      const obrasCall = apiResponses.find(r => r.url.includes('/obras'));
      expect(obrasCall, 'Nenhuma chamada à API /obras detectada').toBeDefined();
      expect(obrasCall?.status, `API /obras retornou ${obrasCall?.status} — esperado 200`).toBe(200);

      // 6. Nenhuma mensagem de erro de auth
      await expect(page.locator('text=401')).not.toBeVisible();
      await expect(page.locator('text=Unauthorized')).not.toBeVisible();

      // 7. Botão "Nova Obra" visível para analista-cadastro
      await expect(
        page.locator('button:has-text("Nova Obra"), a:has-text("Nova Obra")')
      ).toBeVisible({ timeout: 5_000 });

    } finally {
      await context.close();
    }
  });

  test('consultor vê obras mas não tem botão Nova Obra', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const apiResponses: { url: string; status: number }[] = [];
      page.on('response', res => {
        if (res.url().includes('/api/v1/obras')) {
          apiResponses.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto('http://localhost:5173/');
      await expect(page).toHaveURL(/logto\.app/, { timeout: 15_000 });
      await loginWithLogto(page, 'consultor_geral', 'Consultor123!');

      await page.goto('http://localhost:5173/cadastro/obras');
      const obrasPageLocator = page.locator('h1, table, [class*="emptyState"], [class*="ObrasPage"]');
      await obrasPageLocator.first().waitFor({ state: 'visible', timeout: 15_000 });

      await page.waitForTimeout(2_000);

      // API deve retornar 200 (consultor tem scope 'access')
      const obrasCall = apiResponses.find(r => r.url.includes('/obras'));
      expect(obrasCall, 'Nenhuma chamada à API /obras detectada').toBeDefined();
      expect(obrasCall?.status, `API /obras retornou ${obrasCall?.status} — esperado 200`).toBe(200);

      // Botão "Nova Obra" NÃO deve aparecer (scope 'write' não concedido para consultor)
      await expect(
        page.locator('button:has-text("Nova Obra"), a:has-text("Nova Obra")')
      ).not.toBeVisible({ timeout: 5_000 });

    } finally {
      await context.close();
    }
  });
});
