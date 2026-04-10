import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const KEYCLOAK_URL = 'https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_01_criar-obra';
const REQUEST_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

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

test.describe('CT-08: HU-01 — Criar obra musical via UI', () => {
  test('CT-08: Navegar para /cadastro/obras/nova, preencher formulário e salvar', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    appendLog('');
    appendLog('========================================');
    appendLog('CT-08: UI — Criar obra via formulário');
    appendLog(`Timestamp: ${new Date().toISOString()}`);
    appendLog('========================================');

    // Obter token e injetar via localStorage (OIDC storage)
    const token = await getToken();
    if (!token) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Motivo: Token não obtido para autenticação UI');
      throw new Error('Token não obtido para autenticação UI');
    }
    appendLog('Token de autenticação obtido com sucesso.');

    // Navegar para a página inicial para configurar o storage de auth
    await page.goto(`${BASE_URL}/`);

    // Aguarda a página carregar (pode redirecionar para login ou callback)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct08_01_inicio.png'),
      fullPage: true,
    });
    appendLog('Screenshot inicial: ct08_01_inicio.png');

    // Verificar se está na página de login do Keycloak ou na app
    const currentUrl = page.url();
    appendLog(`URL após navegação inicial: ${currentUrl}`);

    // Se redirecionou para Keycloak, fazer login via formulário
    if (currentUrl.includes('keycloak') || currentUrl.includes('login')) {
      appendLog('Redirecionado para login — preenchendo credenciais no Keycloak');

      await page.fill('#username', 'analista.teste');
      await page.fill('#password', 'Analista123!');

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ct08_02_login_preenchido.png'),
        fullPage: true,
      });

      await page.click('#kc-login');
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ct08_03_pos_login.png'),
        fullPage: true,
      });
      appendLog(`URL após login: ${page.url()}`);
    }

    // Navegar diretamente para a rota de criação de obra
    await page.goto(`${BASE_URL}/cadastro/obras/nova`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct08_04_pagina_nova_obra.png'),
      fullPage: true,
    });
    appendLog(`URL na página de criação: ${page.url()}`);

    // Verificar se o formulário está visível
    const tituloInput = page.locator('#obra-titulo');
    const tipoSelect = page.locator('#obra-tipo');

    const tituloVisible = await tituloInput.isVisible({ timeout: 10000 }).catch(() => false);
    appendLog(`Campo título visível: ${tituloVisible}`);

    if (!tituloVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ct08_fail_formulario_nao_encontrado.png'),
        fullPage: true,
      });
      appendLog('--- RESULTADO: FAIL ---');
      appendLog(`Expected: Formulário de criação de obra visível em ${BASE_URL}/cadastro/obras/nova`);
      appendLog(`Actual: Campo #obra-titulo não encontrado. URL atual: ${page.url()}`);
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-08 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error('Formulário de criação não encontrado');
    }

    // Preencher o formulário
    await tituloInput.fill('Obra Via Interface');
    appendLog('Campo título preenchido: "Obra Via Interface"');

    // Selecionar tipo MUSICAL
    await tipoSelect.selectOption('MUSICAL');
    appendLog('Tipo selecionado: MUSICAL');

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct08_05_formulario_preenchido.png'),
      fullPage: true,
    });

    // Clicar em Salvar
    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();
    appendLog('Botão Salvar clicado');

    // Aguardar redirecionamento para /cadastro/obras
    await page.waitForURL('**/cadastro/obras', { timeout: 15000 }).catch(async () => {
      appendLog(`URL após submit (sem redirect): ${page.url()}`);
    });

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct08_06_pos_submit.png'),
      fullPage: true,
    });

    const finalUrl = page.url();
    appendLog(`URL final após submit: ${finalUrl}`);

    // Assertion: deve ter redirecionado para /cadastro/obras
    const redirectedToList = finalUrl.includes('/cadastro/obras') && !finalUrl.includes('/nova');

    if (!redirectedToList) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Redirecionamento para /cadastro/obras após salvar');
      appendLog(`Actual: URL final = ${finalUrl}`);
      if (consoleLogs.length > 0 || pageErrors.length > 0) {
        appendLog('--- BROWSER CONSOLE CT-08 ---');
        [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
      }
      throw new Error(`Redirecionamento esperado para /cadastro/obras, mas URL é: ${finalUrl}`);
    }

    // Verificar que a obra aparece na listagem
    const obraItem = page.locator('text=Obra Via Interface');
    const obraVisivel = await obraItem.isVisible({ timeout: 8000 }).catch(() => false);
    appendLog(`Obra "Obra Via Interface" visível na listagem: ${obraVisivel}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ct08_07_listagem_com_obra.png'),
      fullPage: true,
    });

    if (consoleLogs.length > 0 || pageErrors.length > 0) {
      appendLog('--- BROWSER CONSOLE CT-08 ---');
      [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
    }

    if (!obraVisivel) {
      appendLog('--- RESULTADO: FAIL ---');
      appendLog('Expected: Obra "Obra Via Interface" visível na listagem após criação');
      appendLog('Actual: Obra não encontrada na listagem. Pode ser paginação ou filtro ativo.');
      throw new Error('Obra criada não encontrada na listagem');
    }

    appendLog('--- RESULTADO: PASS ---');
    appendLog(`Redirecionamento para listagem: OK (${finalUrl})`);
    appendLog('Obra visível na listagem: OK');
  });
});
