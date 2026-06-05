import { expect, test, type Page } from '@playwright/test';
import { loginWithLogto } from './logto-login';

const AUDITOR_USER = process.env.AUDITORIA_E2E_AUDITOR_USER;
const AUDITOR_PASS = process.env.AUDITORIA_E2E_AUDITOR_PASS;
const LIMITED_USER = process.env.AUDITORIA_E2E_LIMITED_USER;
const LIMITED_PASS = process.env.AUDITORIA_E2E_LIMITED_PASS;
const GOLD_SCREEN_ID = process.env.AUDITORIA_E2E_GOLD_SCREEN_ID ?? 'cadastro.titulares.lista';
const GOLD_SCREEN_LABEL = process.env.AUDITORIA_E2E_GOLD_SCREEN_LABEL ?? 'Cadastro - Titulares';
const GOLD_CONTEXT = process.env.AUDITORIA_E2E_GOLD_CONTEXT ?? '';

async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveURL(/logto\.app/, { timeout: 15_000 });
  await loginWithLogto(page, username, password);
}

async function filterGoldEvents(page: Page): Promise<void> {
  await page.goto('/auditoria/eventos');
  await expect(page.getByRole('heading', { name: 'Eventos de auditoria' })).toBeVisible();

  await page.getByLabel('Tela').selectOption(GOLD_SCREEN_ID);
  await page.getByLabel('Nível').selectOption('GOLD');

  if (GOLD_CONTEXT) {
    await page.getByLabel('Contexto de negócio').fill(GOLD_CONTEXT);
  }

  await page.getByRole('button', { name: 'Buscar eventos' }).click();
  await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('row').filter({ hasText: GOLD_SCREEN_LABEL }).first()).toBeVisible();
}

test.describe('Auditoria de telas por criticidade', () => {
  test.skip(
    !AUDITOR_USER || !AUDITOR_PASS || !LIMITED_USER || !LIMITED_PASS,
    'Defina AUDITORIA_E2E_AUDITOR_USER/PASS e AUDITORIA_E2E_LIMITED_USER/PASS para executar o fluxo real.',
  );

  test('auditor consulta catálogo, filtra eventos e abre snapshot Ouro', async ({ page }) => {
    await login(page, AUDITOR_USER!, AUDITOR_PASS!);

    await page.goto('/auditoria/catalogo');
    await expect(page.getByRole('heading', { name: 'Catálogo de auditoria' })).toBeVisible();
    await page.getByLabel('Nível').selectOption('GOLD');
    await expect(page.getByText(GOLD_SCREEN_LABEL)).toBeVisible();
    await expect(page.getByText('Snapshot somente para usuários com permissão forte de auditoria').first()).toBeVisible();

    await filterGoldEvents(page);
    await page.getByRole('button', { name: 'Ver detalhes do evento' }).first().click();

    await expect(page.getByRole('heading', { name: 'Snapshot Ouro' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('pre').filter({ hasText: /[{[]/ }).first()).toBeVisible();
  });

  test('usuário sem snapshot:visualizar não vê o snapshot Ouro no DOM', async ({ page }) => {
    await login(page, LIMITED_USER!, LIMITED_PASS!);

    await filterGoldEvents(page);
    await page.getByRole('button', { name: 'Ver detalhes do evento' }).first().click();

    await expect(page.getByText('Snapshot Ouro restrito.')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('pre')).not.toBeVisible();
  });
});
