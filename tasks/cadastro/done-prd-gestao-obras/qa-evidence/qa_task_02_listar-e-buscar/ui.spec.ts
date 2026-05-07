import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const KEYCLOAK_URL = 'https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_02_listar-e-buscar';
const REQUEST_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

async function getToken(username: string, password: string): Promise<string> {
  const resp = await fetch(KEYCLOAK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'mcad-cli',
      grant_type: 'password',
      username,
      password,
    }),
  });
  const data = await resp.json() as { access_token?: string };
  return data.access_token ?? '';
}

async function loginViaUI(page: any, username: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const currentUrl = page.url();
  if (currentUrl.includes('keycloak') || currentUrl.includes('login')) {
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('#kc-login');
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }
}

function appendLog(text: string) {
  fs.appendFileSync(REQUEST_LOG, text + '\n');
}

test.describe('CT-09 e CT-10: HU-03 — Listagem de obras (UI)', () => {

  test('CT-09: Listagem em /cadastro/obras exibe filtros visuais (analista)', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('');
    appendLog('========================================');
    appendLog('CT-09: UI — Listagem de obras com filtros visuais (analista)');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog('========================================');

    // Login como analista
    await loginViaUI(page, 'analista.teste', 'Analista123!');
    appendLog(`URL apos login: ${page.url()}`);

    // Screenshot pos-login
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct09_01_pos_login.png'),
      fullPage: true,
    });

    // Navegar para listagem de obras
    await page.goto(`${BASE_URL}/cadastro/obras`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct09_02_pagina_obras.png'),
      fullPage: true,
    });
    appendLog(`URL na pagina obras: ${page.url()}`);

    // Verificar se a pagina nao redirecionou para login
    if (page.url().includes('keycloak') || page.url().includes('login')) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Pagina /cadastro/obras carregada');
      appendLog(`Actual: Redirecionou para login em ${page.url()}`);
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-09 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Redirecionou para login inesperadamente');
    }

    // Verificar que a tabela de obras está visivel (ou estado vazio)
    // A ObrasTable renderiza uma tabela com thead quando há dados
    const temTabela = await page.locator('table').isVisible({ timeout: 10000 }).catch(() => false);
    const temEstadoVazio = await page.locator('text=Nenhuma obra encontrada').isVisible({ timeout: 2000 }).catch(() => false);
    const temLoading = await page.locator('[class*="loading"]').isVisible({ timeout: 2000 }).catch(() => false);

    appendLog(`Tabela visivel: ${temTabela}`);
    appendLog(`Estado vazio visivel: ${temEstadoVazio}`);
    appendLog(`Loading visivel: ${temLoading}`);

    // Se ainda está carregando, aguardar
    if (temLoading) {
      await page.waitForFunction(() => !document.querySelector('[class*="loading"]'), { timeout: 10000 }).catch(() => {});
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ct09_03_pos_loading.png'),
        fullPage: true,
      });
    }

    const temTabelaFinal = await page.locator('table').isVisible({ timeout: 5000 }).catch(() => false);
    const temEstadoVazioFinal = await page.locator('text=Nenhuma obra encontrada').isVisible({ timeout: 2000 }).catch(() => false);
    appendLog(`Tabela visivel (final): ${temTabelaFinal}`);
    appendLog(`Estado vazio (final): ${temEstadoVazioFinal}`);

    // Verificar que há filtros (ObrasFilters renderiza algum container de filtros)
    const temFiltros = await page.locator('input[type="text"], input[type="search"], select').first().isVisible({ timeout: 5000 }).catch(() => false);
    appendLog(`Campos de filtro visiveis: ${temFiltros}`);

    // Verificar que o botao "Nova Obra" esta presente para o analista
    const temBotaoNova = await page.locator('#btn-nova-obra, [id="btn-nova-obra"], button:has-text("Nova Obra")').isVisible({ timeout: 5000 }).catch(() => false);
    appendLog(`Botao Nova Obra visivel: ${temBotaoNova}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct09_04_estado_final.png'),
      fullPage: true,
    });

    // Assertions
    if (!(temTabelaFinal || temEstadoVazioFinal)) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Tabela de obras ou estado vazio visivel em /cadastro/obras');
      appendLog('Actual: Nenhum dos dois elementos encontrado');
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-09 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Listagem de obras nao carregou');
    }

    if (!temFiltros) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Campos de filtro visiveis na pagina');
      appendLog('Actual: Nenhum input ou select de filtro encontrado');
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-09 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Filtros nao encontrados na pagina');
    }

    appendLog('--- RESULTADO: PASS ---');
    appendLog('Listagem de obras carregada com tabela/estado vazio e filtros visiveis');
    appendLog(`Botao Nova Obra visivel para analista: ${temBotaoNova}`);

    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('--- BROWSER CONSOLE CT-09 ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }
  });

  test('CT-10: Consultor nao ve botoes de acao (criar, editar, excluir)', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('');
    appendLog('========================================');
    appendLog('CT-10: UI — Consultor nao ve botoes de acao');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog('========================================');

    // Login como consultor
    await loginViaUI(page, 'consultor.teste', 'Consultor123!');
    appendLog(`URL apos login consultor: ${page.url()}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct10_01_pos_login_consultor.png'),
      fullPage: true,
    });

    // Navegar para listagem de obras
    await page.goto(`${BASE_URL}/cadastro/obras`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct10_02_pagina_obras_consultor.png'),
      fullPage: true,
    });
    appendLog(`URL na pagina obras (consultor): ${page.url()}`);

    // Aguardar carregamento
    await page.waitForTimeout(3000);

    // Verificar que o botao "Nova Obra" NAO esta presente
    const temBotaoNova = await page.locator('#btn-nova-obra, button:has-text("Nova Obra")').isVisible({ timeout: 3000 }).catch(() => false);
    appendLog(`Botao Nova Obra visivel (deve ser FALSE): ${temBotaoNova}`);

    // Verificar que nao ha coluna de Acoes na tabela
    const temColunaAcoes = await page.locator('th[aria-label="Ações"], th:has-text("Ações")').isVisible({ timeout: 3000 }).catch(() => false);
    appendLog(`Coluna Acoes visivel (deve ser FALSE): ${temColunaAcoes}`);

    // Verificar que nao ha botoes de editar/excluir
    const temBotoesEditar = await page.locator('button[aria-label*="Editar"]').count().then(c => c > 0).catch(() => false);
    const temBotoesExcluir = await page.locator('button[aria-label*="Excluir"]').count().then(c => c > 0).catch(() => false);
    appendLog(`Botoes de Editar visiveis (deve ser FALSE): ${temBotoesEditar}`);
    appendLog(`Botoes de Excluir visiveis (deve ser FALSE): ${temBotoesExcluir}`);

    // A tabela deve ainda carregar dados (consultor pode ler)
    const temTabela = await page.locator('table').isVisible({ timeout: 5000 }).catch(() => false);
    const temEstadoVazio = await page.locator('text=Nenhuma obra encontrada').isVisible({ timeout: 2000 }).catch(() => false);
    appendLog(`Tabela de dados visivel: ${temTabela || temEstadoVazio}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct10_03_estado_final_consultor.png'),
      fullPage: true,
    });

    // Assertions
    if (temBotaoNova) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Botao "Nova Obra" NAO visivel para perfil consultor');
      appendLog('Actual: Botao "Nova Obra" esta visivel — consultor nao deveria ter acesso de escrita');
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-10 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Botao "Nova Obra" visivel para consultor — FAIL');
    }

    if (temColunaAcoes || temBotoesEditar || temBotoesExcluir) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Sem coluna Acoes, sem botoes Editar/Excluir para consultor');
      appendLog(`Actual: temColunaAcoes=${temColunaAcoes}, temBotoesEditar=${temBotoesEditar}, temBotoesExcluir=${temBotoesExcluir}`);
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-10 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Botoes de acao visiveis para consultor — FAIL');
    }

    appendLog('--- RESULTADO: PASS ---');
    appendLog('Consultor nao ve botao Nova Obra, sem coluna Acoes, sem botoes Editar/Excluir');
    appendLog(`Dados de listagem carregados: ${temTabela || temEstadoVazio}`);

    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('--- BROWSER CONSOLE CT-10 ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }
  });
});
