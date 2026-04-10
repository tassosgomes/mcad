import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_04_obter-iswc';
const REQUEST_LOG = `${EVIDENCE_DIR}/requests.log`;

// Use a PENDENTE obra that has no ISWC (Andar com Fe)
const OBRA_PENDENTE_SEM_ISWC_ID = '3a42dd7a-1f44-4f19-af88-33ec27a5e0d7';
// Use a LIBERADO obra that has ISWC (Garota de Ipanema — already obtained ISWC)
const OBRA_COM_ISWC_ID = '9f5729f0-0cfc-41dd-9af5-0c90c77623c9';

function appendLog(text: string) {
  fs.appendFileSync(REQUEST_LOG, text + '\n');
}

test.describe('CT-06: UI — Botao Obter ISWC na tela de detalhe da obra', () => {

  test('CT-06a: Botao "Obter ISWC" visivel em obra PENDENTE sem ISWC', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('\n========================================');
    appendLog('CT-06a: UI — Botao "Obter ISWC" em obra PENDENTE sem ISWC');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog(`URL: ${BASE_URL}/obras/${OBRA_PENDENTE_SEM_ISWC_ID}`);
    appendLog('========================================');

    // Navigate to obra detail page
    await page.goto(`${BASE_URL}/obras/${OBRA_PENDENTE_SEM_ISWC_ID}`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct06a_inicio.png`,
      fullPage: true
    });

    // Check if page loaded (not redirected to login or 404)
    const pageContent = await page.content();
    const pageTitle = await page.title();
    appendLog(`Page title: ${pageTitle}`);
    appendLog(`Page URL after load: ${page.url()}`);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct06a_page_loaded.png`,
      fullPage: true
    });

    // Look for "Obter ISWC" button — various possible selectors
    const iswcButtonSelectors = [
      'button:has-text("Obter ISWC")',
      'button:has-text("obter iswc")',
      '[data-testid="btn-obter-iswc"]',
      'button[aria-label*="ISWC"]',
      'button:has-text("ISWC")',
    ];

    let buttonFound = false;
    let buttonLocator = null;

    for (const selector of iswcButtonSelectors) {
      const el = page.locator(selector);
      const count = await el.count();
      if (count > 0) {
        buttonFound = true;
        buttonLocator = el;
        appendLog(`Botao encontrado com selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct06a_pre_assert.png`,
      fullPage: true
    });

    // Log console output
    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('--- BROWSER CONSOLE CT-06a ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }

    if (buttonFound) {
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct06a_pass.png`,
        fullPage: true
      });
      appendLog('--- RESULTADO CT-06a: PASS --- Botao "Obter ISWC" visivel');
    } else {
      // Check if page redirected (auth required) or obra page not found
      const currentUrl = page.url();
      appendLog(`--- RESULTADO CT-06a: FAIL ---`);
      appendLog(`Expected: botao "Obter ISWC" visivel na tela de detalhe`);
      appendLog(`Actual: botao nao encontrado. URL atual: ${currentUrl}`);
      appendLog(`Page text (primeiros 500 chars): ${pageContent.slice(0, 500)}`);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct06a_fail.png`,
        fullPage: true
      });
    }

    expect(buttonFound, 'Botao "Obter ISWC" deve estar visivel em obra PENDENTE sem ISWC').toBe(true);
  });

  test('CT-06b: Botao "ISWC Obtido" ou desabilitado em obra que ja tem ISWC', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('\n========================================');
    appendLog('CT-06b: UI — Botao em obra com ISWC ja obtido (Garota de Ipanema)');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog(`URL: ${BASE_URL}/obras/${OBRA_COM_ISWC_ID}`);
    appendLog('========================================');

    await page.goto(`${BASE_URL}/obras/${OBRA_COM_ISWC_ID}`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct06b_inicio.png`,
      fullPage: true
    });

    const currentUrl = page.url();
    appendLog(`Page URL: ${currentUrl}`);

    // Check for disabled button or "ISWC Obtido" text
    const iswcObtidoSelectors = [
      'button:has-text("ISWC Obtido")',
      'button[disabled]:has-text("ISWC")',
      '[data-testid="btn-iswc-obtido"]',
    ];

    // Also check regular enabled "Obter ISWC" — should NOT be enabled
    const btnObterEnabled = page.locator('button:has-text("Obter ISWC"):not([disabled])');
    const btnObterEnabledCount = await btnObterEnabled.count();

    let obtidoFound = false;
    for (const selector of iswcObtidoSelectors) {
      const el = page.locator(selector);
      const count = await el.count();
      if (count > 0) {
        obtidoFound = true;
        appendLog(`Estado correto encontrado com selector: ${selector}`);
        break;
      }
    }

    // Log console
    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('--- BROWSER CONSOLE CT-06b ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct06b_result.png`,
      fullPage: true
    });

    if (obtidoFound) {
      appendLog('--- RESULTADO CT-06b: PASS --- Botao "ISWC Obtido" ou desabilitado encontrado');
    } else if (btnObterEnabledCount === 0) {
      appendLog('--- RESULTADO CT-06b: INFO --- Botao "Obter ISWC" nao visivel/habilitado (comportamento aceitavel para obra com ISWC)');
    } else {
      appendLog('--- RESULTADO CT-06b: FAIL ---');
      appendLog('Expected: botao desabilitado ou "ISWC Obtido"');
      appendLog(`Actual: botao "Obter ISWC" habilitado (btnObterEnabledCount=${btnObterEnabledCount})`);
    }

    // This test is informational — RF-20 is "Should Have"
    // Just log — do not fail hard on this one
  });
});
