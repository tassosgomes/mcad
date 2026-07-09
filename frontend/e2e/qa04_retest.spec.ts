import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_BASE = 'https://mcad-bff.tasso.dev.br/api/arrecadacao/v1';
const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/arrecadacao/prd-gestao-licencas/qa-evidence/qa_task_04_encerrar_licenca';

function logJson(label: string, obj: any) {
  fs.appendFileSync(EVIDENCE_DIR + '/requests.log', `[${label}] ${JSON.stringify(obj, null, 2)}\n`);
}

test.describe('qa_task_04 retest', () => {
  test.setTimeout(120_000);
  
  test('Full retest suite', async ({ page }) => {
    // ===== LOGIN =====
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    const loginBtn = page.locator('button:has-text("Entrar")').first();
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
    }
    await page.waitForTimeout(3000);
    
    const url = page.url();
    if (url.includes('logto')) {
      const identifier = page.locator('input').first();
      await identifier.waitFor({ state: 'visible', timeout: 15000 });
      await page.evaluate(() => { document.querySelectorAll('form').forEach(f => { f.noValidate = true; }); });
      await identifier.fill('analista_arrecadacao');
      const password = page.locator('input[type="password"]').first();
      const passVisible = await password.isVisible().catch(() => false);
      if (!passVisible) {
        await page.locator('button[type="submit"]').first().click();
        await password.waitFor({ state: 'visible', timeout: 10000 });
      }
      await password.fill('Analista123!');
      await page.locator('button[type="submit"]').first().click();
      
      // Wait for redirect back to app
      await page.waitForURL(url => url.hostname.includes('mcad.tasso.dev.br'), { timeout: 30000 });
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: EVIDENCE_DIR + '/screenshots/login_after.png', fullPage: true });
    
    // Capture token from network requests BEFORE navigating
    const capturedTokens: string[] = [];
    page.on('request', req => {
      const auth = req.headers()['authorization'];
      if (auth && auth.includes('Bearer')) {
        capturedTokens.push(auth.split(' ')[1]);
      }
    });
    
    // Navigate to licenses page and wait for network idle
    await page.goto(BASE_URL + '/arrecadacao/licencas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: EVIDENCE_DIR + '/screenshots/licencas_page.png', fullPage: true });
    
    console.log('Captured tokens count:', capturedTokens.length);
    let token = capturedTokens.length > 0 ? capturedTokens[0] : null;
    
    // If no token captured, try to reload to trigger API calls
    if (!token) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      token = capturedTokens.length > 0 ? capturedTokens[0] : null;
    }
    
    console.log('Token found:', !!token);
    if (!token) {
      console.log('No token found, aborting');
      return;
    }
    
    // API helper
    const apiCall = async (method: string, path: string, body?: any) => {
      return await page.evaluate(async ({method, path, body, token}) => {
        const res = await fetch('https://mcad-bff.tasso.dev.br/api/arrecadacao/v1' + path, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: body ? JSON.stringify(body) : undefined
        });
        const status = res.status;
        const bodyText = await res.text();
        return { status, body: bodyText };
      }, { method, path, body, token });
    };
    
    // ===== LIST LICENSES =====
    let allLicenses: any[] = [];
    let pageNum = 0;
    let hasMore = true;
    while (hasMore && pageNum < 5) {
      const listRes = await apiCall('GET', `/licencas?page=${pageNum}&size=50`);
      if (listRes.status === 200) {
        const data = JSON.parse(listRes.body);
        const licenses = data.items || [];
        allLicenses = allLicenses.concat(licenses);
        hasMore = data.metadata?.hasNextPage || licenses.length === 50;
        pageNum++;
      } else {
        hasMore = false;
      }
    }
    
    logJson('LIST_LICENSES', { totalCount: allLicenses.length });
    console.log('Total licenses found:', allLicenses.length);
    
    let encerrada = allLicenses.find((l: any) => l.status === 'ENCERRADA');
    let suspensa = allLicenses.find((l: any) => l.status === 'SUSPENSA');
    let ativa = allLicenses.find((l: any) => l.status === 'ATIVA');
    
    console.log('Initial candidates:', { encerrada: !!encerrada, suspensa: !!suspensa, ativa: !!ativa });
    
    // ===== PRE-CONDITION: Suspend an ATIVA license to create SUSPENSA =====
    if (!suspensa && ativa) {
      console.log('Creating SUSPENSA by suspending ATIVA license', ativa.id);
      const suspendRes = await apiCall('POST', `/licencas/${ativa.id}/suspender`, { justificativa: 'Pendência financeira identificada — aguardando regularização' });
      logJson('SUSPEND_REQUEST', { status: suspendRes.status, body: suspendRes.body });
      console.log('Suspend result:', suspendRes.status, suspendRes.body.substring(0, 200));
      if (suspendRes.status === 200) {
        const suspendBody = JSON.parse(suspendRes.body);
        if (suspendBody.status === 'SUSPENSA') {
          suspensa = suspendBody;
          ativa = allLicenses.find((l: any) => l.id !== suspensa.id && l.status === 'ATIVA');
        }
      }
    }
    
    // ===== CT-01: Close a SUSPENSA license (retest happy path) =====
    if (suspensa) {
      console.log('CT-01: Testing suspensa license', suspensa.id);
      const ct01 = await apiCall('POST', `/licencas/${suspensa.id}/encerrar`, { justificativa: 'Contrato rescindido' });
      logJson('CT-01_REQUEST', { status: ct01.status, body: ct01.body });
      const ct01Body = JSON.parse(ct01.body);
      const ct01Pass = ct01.status === 200 && ct01Body.status === 'ENCERRADA';
      fs.writeFileSync(EVIDENCE_DIR + '/ct01_result.json', JSON.stringify({ status: ct01.status, body: ct01Body, pass: ct01Pass }, null, 2));
      console.log('CT-01 result:', ct01.status, ct01Body.status, 'PASS:', ct01Pass);
    } else {
      console.log('CT-01: No suspensa license found, skipping');
      fs.writeFileSync(EVIDENCE_DIR + '/ct01_result.json', JSON.stringify({ skipped: true, reason: 'No suspensa license found' }, null, 2));
    }
    
    // ===== CT-02: Try to close already ENCERRADA =====
    // Re-list to find current ENCERRADA
    const listRes2 = await apiCall('GET', '/licencas?page=0&size=50');
    if (listRes2.status === 200) {
      const data2 = JSON.parse(listRes2.body);
      const licenses2 = data2.items || [];
      encerrada = licenses2.find((l: any) => l.status === 'ENCERRADA');
    }
    
    if (encerrada) {
      console.log('CT-02: Testing encerrada license', encerrada.id);
      const ct02 = await apiCall('POST', `/licencas/${encerrada.id}/encerrar`, { justificativa: 'Tentativa de encerramento duplicado' });
      logJson('CT-02_REQUEST', { status: ct02.status, body: ct02.body });
      const ct02Body = JSON.parse(ct02.body);
      const ct02Pass = ct02.status === 422 && ct02Body.detail && ct02Body.detail.toUpperCase().includes('ENCERRADA');
      fs.writeFileSync(EVIDENCE_DIR + '/ct02_result.json', JSON.stringify({ status: ct02.status, body: ct02Body, pass: ct02Pass }, null, 2));
      console.log('CT-02 result:', ct02.status, ct02Body.detail, 'PASS:', ct02Pass);
    } else {
      console.log('CT-02: No encerrada license found, skipping');
      fs.writeFileSync(EVIDENCE_DIR + '/ct02_result.json', JSON.stringify({ skipped: true, reason: 'No encerrada license found' }, null, 2));
    }
    
    // ===== CT-03: Try to close ATIVA =====
    if (ativa) {
      console.log('CT-03: Testing ativa license', ativa.id);
      const ct03 = await apiCall('POST', `/licencas/${ativa.id}/encerrar`, { justificativa: 'Tentativa de encerrar ativa' });
      logJson('CT-03_REQUEST', { status: ct03.status, body: ct03.body });
      const ct03Body = JSON.parse(ct03.body);
      const ct03Pass = ct03.status === 422 && ct03Body.detail && (ct03Body.detail.toLowerCase().includes('suspensa') || ct03Body.detail.toLowerCase().includes('ativa'));
      fs.writeFileSync(EVIDENCE_DIR + '/ct03_result.json', JSON.stringify({ status: ct03.status, body: ct03Body, pass: ct03Pass }, null, 2));
      console.log('CT-03 result:', ct03.status, ct03Body.detail, 'PASS:', ct03Pass);
    }
    
    // ===== CT-06: Navigate to SUSPENSA detail =====
    // Re-list to find current ATIVA and suspend it for CT-06/07
    const listRes3 = await apiCall('GET', '/licencas?page=0&size=50');
    let suspensaForCT06: any = null;
    let ativaForCT06: any = null;
    if (listRes3.status === 200) {
      const data3 = JSON.parse(listRes3.body);
      const licenses3 = data3.items || [];
      suspensaForCT06 = licenses3.find((l: any) => l.status === 'SUSPENSA');
      ativaForCT06 = licenses3.find((l: any) => l.status === 'ATIVA');
    }
    
    // If no SUSPENSA, suspend an ATIVA
    if (!suspensaForCT06 && ativaForCT06) {
      console.log('Creating SUSPENSA for CT-06/07 by suspending ATIVA', ativaForCT06.id);
      const suspendRes2 = await apiCall('POST', `/licencas/${ativaForCT06.id}/suspender`, { justificativa: 'Pendência financeira — CT-06/07 precondição' });
      if (suspendRes2.status === 200) {
        const suspendBody2 = JSON.parse(suspendRes2.body);
        if (suspendBody2.status === 'SUSPENSA') {
          suspensaForCT06 = suspendBody2;
        }
      }
    }
    
    if (suspensaForCT06) {
      await page.goto(BASE_URL + '/arrecadacao/licencas/' + suspensaForCT06.id);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: EVIDENCE_DIR + '/screenshots/ct06_retest_encerrar_button.png', fullPage: true });
      
      const hasEncerrarBtn = await page.locator('button:has-text("Encerrar")').count() > 0;
      fs.writeFileSync(EVIDENCE_DIR + '/ct06_result.json', JSON.stringify({ hasEncerrarBtn }, null, 2));
      console.log('CT-06 hasEncerrarBtn:', hasEncerrarBtn);
      
      // ===== CT-07: Click encerrar via modal =====
      if (hasEncerrarBtn) {
        await page.locator('button:has-text("Encerrar")').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: EVIDENCE_DIR + '/screenshots/ct07_modal_open.png', fullPage: true });
        
        // Fill justificativa
        const justInput = page.locator('textarea, input[placeholder*="justificativa"], input[placeholder*="motivo"], textarea[placeholder*="justificativa"], textarea[placeholder*="motivo"]').first();
        if (await justInput.count() > 0) {
          await justInput.fill('Contrato rescindido');
        }
        
        // Check the "irreversível" checkbox
        const checkbox = page.locator('input[type="checkbox"], label:has-text("irreversível") input').first();
        if (await checkbox.count() > 0) {
          await checkbox.check();
        }
        
        // Click the "Encerrar" button in the modal (not Cancelar)
        const modalEncerrarBtn = page.locator('button:has-text("Encerrar")').nth(1);
        if (await modalEncerrarBtn.count() > 0) {
          await modalEncerrarBtn.click();
        } else {
          const modal = page.locator('[role="dialog"], .modal, .dialog').first();
          if (await modal.count() > 0) {
            const btn = modal.locator('button:has-text("Encerrar")').first();
            if (await btn.count() > 0) {
              await btn.click();
            }
          }
        }
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: EVIDENCE_DIR + '/screenshots/ct07_retest_encerrada.png', fullPage: true });
        
        const pageText = await page.content();
        const hasEncerrada = pageText.toLowerCase().includes('encerrada');
        fs.writeFileSync(EVIDENCE_DIR + '/ct07_result.json', JSON.stringify({ hasEncerrada }, null, 2));
        console.log('CT-07 hasEncerrada:', hasEncerrada);
      }
    } else {
      console.log('CT-06/07: No suspensa license found, skipping');
    }
  });
});
