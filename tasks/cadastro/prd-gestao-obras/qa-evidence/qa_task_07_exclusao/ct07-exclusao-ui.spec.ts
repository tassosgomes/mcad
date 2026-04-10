import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const KEYCLOAK_URL = 'https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_07_exclusao';
// Obra PENDENTE sem vínculos criada durante o setup do CT-07 UI
const OBRA_UI_ID = 'dbf5a492-aa58-4ea3-a87e-9339de88b053';
const OBRA_UI_TITULO = 'Obra QA UI Delete Test';

test.describe('CT-07: UI — Modal de confirmação de exclusão', () => {

  test('CT-07: Exclusão via UI — botão Excluir, modal de confirmação e remoção da lista', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    // Step 1: Navegar para home — aguarda redirecionamento Keycloak
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_01_home.png`,
      fullPage: true,
    });

    // Step 2: Autenticar se redirecionado para Keycloak
    const currentUrl = page.url();
    if (currentUrl.includes('keycloak') || currentUrl.includes('openid-connect') || currentUrl.includes('realms')) {
      await page.fill('#username', 'analista.teste');
      await page.fill('#password', 'Analista123!');
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct07_02_keycloak_login.png`,
        fullPage: true,
      });
      await page.click('#kc-login');
      await page.waitForURL(`${BASE_URL}/**`, { timeout: 20000 });
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_03_apos_login.png`,
      fullPage: true,
    });

    // Step 3: Navegar para a página de detalhes da obra sob rota correta /cadastro/obras/:id
    await page.goto(`${BASE_URL}/cadastro/obras/${OBRA_UI_ID}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_04_detalhe_obra.png`,
      fullPage: true,
    });

    // Verificar que a página carregou a obra
    const errorMsg = page.locator('text=/404|not found|não encontrada/i').first();
    const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasError) {
      const errorText = await errorMsg.textContent().catch(() => 'desconhecido');
      throw new Error(`Página de detalhe da obra retornou erro: ${errorText}. URL: ${page.url()}`);
    }

    // Step 4: Localizar e clicar no botão "Excluir"
    // O botão só aparece para analista-cadastro em obras que não são DEPURADA/DOMINIO_PUBLICO/BLOQUEADO
    const deleteButton = page.locator('button:has-text("Excluir")').first();
    const deleteVisible = await deleteButton.isVisible({ timeout: 10000 }).catch(() => false);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_05_pre_delete_button.png`,
      fullPage: true,
    });

    if (!deleteVisible) {
      const pageContent = await page.content();
      fs.appendFileSync(`${EVIDENCE_DIR}/requests.log`,
        '\n--- BROWSER CONSOLE CT-07 (PRE-FAIL) ---\n' +
        [...consoleLogs, ...pageErrors].join('\n') + '\n' +
        `URL: ${page.url()}\n` +
        'Botão Excluir não encontrado — obra pode não ter carregado ou usuário sem permissão\n'
      );
      throw new Error(`Botão "Excluir" não encontrado na página de detalhe da obra ${OBRA_UI_ID}`);
    }

    await deleteButton.click();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_06_apos_click_excluir.png`,
      fullPage: true,
    });

    // Step 5: Verificar modal de confirmação (DeleteObraModal)
    // Pelo código: DeleteObraModal é um componente separado com isOpen={showDeleteModal}
    const modal = page.locator('[role="dialog"]').first();
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_07_modal_confirmacao.png`,
      fullPage: true,
    });

    expect(modalVisible, 'Modal de confirmação de exclusão deve ser visível após clicar em Excluir').toBeTruthy();

    // Step 6: Confirmar exclusão no modal
    // O DeleteObraModal deve ter um botão de confirmação
    const confirmBtn = page.locator('[role="dialog"] button:has-text("Excluir"), [role="dialog"] button:has-text("Confirmar"), [role="dialog"] button:has-text("Sim")').first();
    const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!confirmVisible) {
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/ct07_08_modal_sem_confirmar.png`,
        fullPage: true,
      });
      throw new Error('Botão de confirmação não encontrado dentro do modal de exclusão');
    }

    await confirmBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_09_apos_confirmacao.png`,
      fullPage: true,
    });

    // Step 7: Verificar redirecionamento para /cadastro/obras (lista)
    const finalUrl = page.url();
    const isOnListPage = finalUrl.includes('/cadastro/obras') && !finalUrl.includes(OBRA_UI_ID);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/ct07_10_resultado_final.png`,
      fullPage: true,
    });

    fs.appendFileSync(`${EVIDENCE_DIR}/requests.log`,
      '\n--- BROWSER CONSOLE CT-07 ---\n' +
      [...consoleLogs, ...pageErrors].join('\n') + '\n' +
      `URL final: ${finalUrl}\n` +
      `Redirecionado para lista: ${isOnListPage}\n`
    );

    // Assertion: deve ter redirecionado para a lista ou mostrar mensagem de sucesso
    const successToast = page.locator('text=/excluída com sucesso|excluido|removida/i').first();
    const hasSuccessToast = await successToast.isVisible({ timeout: 3000 }).catch(() => false);

    expect(
      isOnListPage || hasSuccessToast,
      `Após exclusão deveria redirecionar para /cadastro/obras ou mostrar toast de sucesso. URL atual: ${finalUrl}`
    ).toBeTruthy();
  });
});
