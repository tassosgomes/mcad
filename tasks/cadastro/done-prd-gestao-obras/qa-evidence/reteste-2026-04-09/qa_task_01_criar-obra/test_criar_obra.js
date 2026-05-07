// QA Task 01 - HU-01: Criar obra musical (UI test - timing na listagem [F4])
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/reteste-2026-04-09/qa_task_01_criar-obra/screenshots';
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];

  try {
    // Login via Keycloak
    console.log('[UI] Navegando para a aplicação...');
    await page.goto(`${BASE_URL}/cadastro/obras`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: `${EVIDENCE_DIR}/01_initial_page.png` });

    // Verificar se precisa de login
    const currentUrl = page.url();
    console.log('[UI] URL atual:', currentUrl);

    if (currentUrl.includes('keycloak') || currentUrl.includes('login')) {
      console.log('[UI] Tela de login detectada, fazendo autenticação...');
      await page.fill('input[name="username"], input[id="username"]', 'analista.teste');
      await page.fill('input[name="password"], input[id="password"]', 'Analista123!');
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
      await page.screenshot({ path: `${EVIDENCE_DIR}/02_after_login.png` });
      console.log('[UI] Login concluído. URL:', page.url());
    }

    // Navegar para obras se necessário
    if (!page.url().includes('/cadastro/obras')) {
      await page.goto(`${BASE_URL}/cadastro/obras`, { waitUntil: 'networkidle', timeout: 10000 });
    }
    await page.screenshot({ path: `${EVIDENCE_DIR}/03_obras_listagem.png` });
    console.log('[UI] Página de obras carregada');

    // CT-F4-01: Contar obras na listagem antes de criar
    const countBefore = await page.locator('table tbody tr, [data-testid="obra-row"], .obra-row').count().catch(() => -1);
    console.log('[UI] Linhas na tabela antes:', countBefore);

    // CT-F4-02: Clicar em "Nova Obra"
    const btnNova = page.locator('button:has-text("Nova Obra"), a:has-text("Nova Obra"), [data-testid="btn-nova-obra"]');
    const btnNovaCount = await btnNova.count();
    console.log('[UI] Botão "Nova Obra" encontrado:', btnNovaCount > 0);

    if (btnNovaCount > 0) {
      await btnNova.first().click();
      await page.waitForURL('**/obras/novo', { timeout: 5000 }).catch(() => {});
      await page.screenshot({ path: `${EVIDENCE_DIR}/04_form_criar.png` });
      console.log('[UI] Formulário de criação carregado. URL:', page.url());

      // Preencher formulário
      const titulo = 'Obra UI QA Reteste 2026';
      await page.fill('input[name="titulo"], input[placeholder*="ítulo"], input[placeholder*="titulo"]', titulo).catch(async () => {
        // Tentar encontrar qualquer input de texto
        const inputs = await page.locator('input[type="text"]').all();
        if (inputs.length > 0) await inputs[0].fill(titulo);
      });

      // Selecionar tipo
      await page.selectOption('select[name="tipo"], select', 'MUSICAL').catch(async () => {
        const selects = await page.locator('select').all();
        if (selects.length > 0) await selects[0].selectOption('MUSICAL');
      });

      await page.screenshot({ path: `${EVIDENCE_DIR}/05_form_preenchido.png` });

      // Salvar
      const btnSalvar = page.locator('button:has-text("Salvar"), button[type="submit"]');
      await btnSalvar.first().click();
      console.log('[UI] Clicou em Salvar');

      // Aguardar redirecionamento para detalhe ou listagem
      await page.waitForTimeout(2000);
      const urlAposSalvar = page.url();
      console.log('[UI] URL após salvar:', urlAposSalvar);
      await page.screenshot({ path: `${EVIDENCE_DIR}/06_apos_salvar.png` });

      results.push({ ct: 'F4-UI-01', desc: 'Criar obra via UI e verificar redirecionamento', status: urlAposSalvar !== `${BASE_URL}/cadastro/obras/novo` ? 'PASS' : 'FAIL', detail: `URL após salvar: ${urlAposSalvar}` });

      // CT-F4-03: Verificar se nova obra aparece na listagem (TIMING)
      if (urlAposSalvar.includes('/cadastro/obras/') && !urlAposSalvar.includes('/novo')) {
        // Foi redirecionado para detalhe - verificar se a obra existe
        const tituloNaPagina = await page.locator(`text="${titulo}"`).count().catch(() => 0);
        console.log('[UI] Título encontrado na página de detalhe:', tituloNaPagina > 0);
        results.push({ ct: 'F4-UI-02', desc: 'Obra visível imediatamente após criação (detalhe)', status: tituloNaPagina > 0 ? 'PASS' : 'FAIL', detail: `Título "${titulo}" ${tituloNaPagina > 0 ? 'encontrado' : 'NÃO encontrado'} na página` });

        // Navegar para listagem e verificar timing
        await page.goto(`${BASE_URL}/cadastro/obras`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.screenshot({ path: `${EVIDENCE_DIR}/07_listagem_apos_criacao.png` });
        const tituloNaListagem = await page.locator(`text="${titulo}"`).count().catch(() => 0);
        console.log('[UI] Título encontrado na LISTAGEM após criação:', tituloNaListagem > 0);
        results.push({ ct: 'F4-UI-03', desc: 'Obra visível na listagem imediatamente após criação [F4 timing]', status: tituloNaListagem > 0 ? 'PASS' : 'FAIL', detail: `Título "${titulo}" ${tituloNaListagem > 0 ? 'encontrado' : 'NÃO encontrado'} na listagem` });
      } else {
        // Ficou na listagem
        await page.waitForTimeout(500);
        const tituloNaListagem = await page.locator(`text="${titulo}"`).count().catch(() => 0);
        console.log('[UI] Título encontrado na listagem:', tituloNaListagem > 0);
        results.push({ ct: 'F4-UI-03', desc: 'Obra visível na listagem imediatamente após criação [F4 timing]', status: tituloNaListagem > 0 ? 'PASS' : 'FAIL', detail: `Título "${titulo}" ${tituloNaListagem > 0 ? 'encontrado' : 'NÃO encontrado'}` });
      }
    } else {
      results.push({ ct: 'F4-UI-00', desc: 'Botão Nova Obra encontrado', status: 'FAIL', detail: 'Botão "Nova Obra" não encontrado na página' });
    }

  } catch (err) {
    console.error('[UI] Erro:', err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/error_screenshot.png` }).catch(() => {});
    results.push({ ct: 'UI-ERROR', desc: 'Erro inesperado no teste UI', status: 'ERROR', detail: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n=== RESULTADOS UI ===');
  results.forEach(r => console.log(`[${r.status}] ${r.ct}: ${r.desc} | ${r.detail}`));
  return results;
}

main().catch(console.error);
