/**
 * Helper: realiza login via Logto Cloud com username/password.
 *
 * Logto Cloud usa input[type="email"] mesmo quando username é aceito.
 * Para evitar validação HTML5 do browser (que bloqueia valores sem '@'),
 * desabilitamos noValidate no form antes de submeter.
 */
import type { Page } from '@playwright/test';

export async function loginWithLogto(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  // Aguarda estar na página do Logto
  await page.waitForURL(url => url.hostname.includes('logto.app'), { timeout: 15_000 });

  // Aguarda o campo de identificação aparecer
  const identifierInput = page.locator('input').first();
  await identifierInput.waitFor({ state: 'visible', timeout: 15_000 });

  // Desabilita validação HTML5 para permitir username sem '@'
  await page.evaluate(() => {
    document.querySelectorAll('form').forEach(f => { f.noValidate = true; });
  });

  await identifierInput.fill(username);

  // Verifica se o campo de senha já está visível (login em página única)
  // ou se precisa clicar em "Continue/Continuar" primeiro (fluxo em 2 etapas)
  const passwordInput = page.locator('input[type="password"]');
  const passwordVisible = await passwordInput.isVisible().catch(() => false);

  if (!passwordVisible) {
    // Clica no botão submit para avançar para a etapa de senha
    await page.locator('button[type="submit"]').first().click();
    await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  await passwordInput.fill(password);

  // Submete o formulário de senha
  await page.locator('button[type="submit"]').first().click();

  // Aguarda retorno ao app
  await page.waitForURL('http://localhost:5173/**', { timeout: 30_000 });
}
