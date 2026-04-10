import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_06_dominio-publico';
const REQUEST_LOG = `${EVIDENCE_DIR}/requests.log`;
const KEYCLOAK_URL = 'https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token';
// Use the obra created in API tests (QA DP Obra Pendente, currently in DOMINIO_PUBLICO state)
const OBRA_ID = '00306a5d-18a4-4793-bafb-715ac49f328a';

async function getToken(): Promise<string> {
  const resp = await fetch(KEYCLOAK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'mcad-cli',
      grant_type: 'password',
      username: 'analista.teste',
      password: 'Analista123!',
    }),
  });
  const data = await resp.json() as { access_token?: string };
  return data.access_token ?? '';
}

function appendLog(text: string) {
  fs.appendFileSync(REQUEST_LOG, text + '\n');
}

test.describe('HU-05 — Domínio Público — UI', () => {

  test('CT-05: Verificar toggle de Domínio Público na tela de detalhe da obra', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('');
    appendLog('========================================');
    appendLog('CT-05: UI — Verificar toggle Domínio Público');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog('========================================');

    // Step 1: Navigate to trigger auth redirect
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct05_01_inicio.png`,
      fullPage: true
    });

    const urlAfterInit = page.url();
    appendLog(`URL após navegação inicial: ${urlAfterInit}`);

    // Step 2: Handle login page (either Keycloak or frontend login)
    // Check for Keycloak's own login form
    const usernameInput = page.locator('#username');
    const hasKeycloakForm = await usernameInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasKeycloakForm) {
      appendLog('Formulário Keycloak detectado — preenchendo credenciais');
      await page.fill('#username', 'analista.teste');
      await page.fill('#password', 'Analista123!');

      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct05_02_login_preenchido.png`,
        fullPage: true
      });

      await page.click('#kc-login');
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      appendLog(`URL após login Keycloak: ${page.url()}`);
    } else {
      appendLog(`Keycloak form não encontrado — URL: ${urlAfterInit}`);
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct05_03_pos_login.png`,
      fullPage: true
    });

    // Step 3: Navigate to obra detail page
    await page.goto(`${BASE_URL}/cadastro/obras/${OBRA_ID}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const urlAfterObra = page.url();
    appendLog(`URL após navegar para obra: ${urlAfterObra}`);

    // If redirected to login again, handle it
    const hasKeycloakForm2 = await page.locator('#username').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasKeycloakForm2) {
      appendLog('Redirecionado para login novamente — re-autenticando');
      await page.fill('#username', 'analista.teste');
      await page.fill('#password', 'Analista123!');
      await page.click('#kc-login');
      await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
      appendLog(`URL após segunda autenticação: ${page.url()}`);
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct05_04_obra_detail.png`,
      fullPage: true
    });

    appendLog(`URL final: ${page.url()}`);

    // Step 4: Assert DominioPublicoToggle is visible
    // Try multiple selectors
    const dpCheckbox = page.locator('[aria-label="Alternar status de domínio público"]');
    const dpLabelText = page.locator('text=Domínio Público').first();

    const checkboxVisible = await dpCheckbox.isVisible({ timeout: 10000 }).catch(() => false);
    const labelVisible = await dpLabelText.isVisible({ timeout: 5000 }).catch(() => false);

    appendLog(`\n--- UI ASSERTION CT-05 ---`);
    appendLog(`Checkbox [aria-label="Alternar status de domínio público"] visível: ${checkboxVisible}`);
    appendLog(`Label "Domínio Público" visível: ${labelVisible}`);
    appendLog(`URL no momento da assertion: ${page.url()}`);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct05_05_pre_assert.png`,
      fullPage: true
    });

    // Assertion: at minimum the label must be visible
    if (!labelVisible && !checkboxVisible) {
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct05_fail.png`,
        fullPage: true
      });
      appendLog(`--- RESULTADO CT-05: FAIL ---`);
      appendLog(`Expected: Toggle/label "Domínio Público" visível na tela de detalhe da obra`);
      appendLog(`Actual: checkbox visível=${checkboxVisible}, label visível=${labelVisible}`);
      appendLog(`URL atual: ${page.url()}`);

      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('\n--- BROWSER CONSOLE CT-05 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }

      throw new Error('Toggle/label "Domínio Público" não encontrado na tela de detalhe da obra');
    }

    // At least the label should be visible
    expect(labelVisible || checkboxVisible, 'Elemento Domínio Público deve estar visível na tela').toBe(true);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct05_06_pass.png`,
      fullPage: true
    });

    appendLog(`--- RESULTADO CT-05: PASS ---`);
    appendLog(`Toggle/label "Domínio Público" presente na tela de detalhe. checkbox=${checkboxVisible}, label=${labelVisible}`);
    appendLog('');

    // Log browser console
    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('\n--- BROWSER CONSOLE CT-05 ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }
  });
});
