// QA Preflight runner v2 — qa_task_00
// Fixes: capture token cleanly, hit /api/me + /api/me/permissions, log error bodies for 401.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const SHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const REQ_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const AUTHZ_URL = 'https://mcad-authz.tasso.dev.br';

const EXPECTED_ROLES = {
  'consultor.dev':         'distribuicao.default.consultor',
  'operador.dev':          'distribuicao.default.operador',
  'gerente.dev':           'distribuicao.default.gerente',
  'analista.dev':          'distribuicao.default.analista',
  'gestor-acessos.dev':    'acessos.default.gestor',
  'consultor-acessos.dev': 'acessos.default.consultor',
};

const HEADLESS = process.env.HEADLESS === 'true' || !process.env.DISPLAY;

function ensureDirs() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

function logReq(method, url, status, durMs, jwtFingerprint, note) {
  const line = `${new Date().toISOString()}\t${method}\t${url}\tstatus=${status}\tdur=${durMs}ms\tjwt=${jwtFingerprint || '-'}\t${note || ''}\n`;
  fs.appendFileSync(REQ_LOG, line);
}

function jwtFingerprint(token) {
  if (!token || typeof token !== 'string') return '-';
  return '...' + token.slice(-6);
}

function parseCreds(text) {
  const records = text.split(/-{5,}\n?/g);
  const out = [];
  for (const rec of records) {
    const trimmed = rec.trim();
    if (!trimmed) continue;
    const hint = (rec.match(/Hint:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const email = (rec.match(/Endereço de e-mail:\s*([^\r\n]+)/i) || rec.match(/E-?mail:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const username = (rec.match(/Nome de usuário:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const senha = (rec.match(/(?:Nova\s+)?Senha:\s*([^\r\n]+)/i) || [])[1]?.trim();
    if (hint && email && senha) {
      out.push({ hint, email, username, senha });
    }
  }
  return out;
}

async function loginUser(browser, cred) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  let capturedToken = null;
  let capturedTokenAt = null;

  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(BFF_URL)) {
      const auth = req.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ')) {
        const tok = auth.slice(7);
        if (!capturedToken) {
          capturedToken = tok;
          capturedTokenAt = Date.now();
        }
      }
    }
  });

  const result = {
    hint: cred.hint,
    email: cred.email,
    login_status: 'unknown',
    me_status: null,
    me_permissions_status: null,
    me_permissions_count: null,
    me_permissions: null,
    me_error_body: null,
    me_subject_id_redacted: null,
    expected_role: EXPECTED_ROLES[cred.hint] || null,
    has_expected_permissions: null,
    notes: [],
    token_fingerprint: null,
    duration_ms: 0,
  };

  const t0 = Date.now();
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForURL(/logto\.app/, { timeout: 30000 }).catch(() => {});

    if (!page.url().includes('logto.app')) {
      result.login_status = 'no_redirect_to_logto';
      result.notes.push(`Did not reach Logto. URL=${page.url()}`);
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_no_logto.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }

    // Fill email + password.
    const emailSel = ['input[name="identifier"]', 'input[type="email"]', 'input[name="email"]', 'input[autocomplete="username"]'];
    let emailFilled = false;
    for (const sel of emailSel) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.fill(cred.email, { timeout: 5000 }).catch(() => {});
        emailFilled = true;
        break;
      }
    }
    if (!emailFilled) {
      const userInput = page.locator('input[name="username"], input[autocomplete="username"]').first();
      if (await userInput.count()) {
        await userInput.fill(cred.username || cred.email).catch(() => {});
        emailFilled = true;
      }
    }
    if (!emailFilled) {
      result.login_status = 'no_email_field';
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_no_input.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }
    const submit1 = page.locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Continue"), button:has-text("Próximo"), button:has-text("Next")').first();
    if (await submit1.count()) await submit1.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press('Enter').catch(() => {});

    await page.waitForSelector('input[type="password"]', { timeout: 15000 }).catch(() => {});
    const pwdInput = page.locator('input[type="password"]').first();
    if (await pwdInput.count()) {
      await pwdInput.fill(cred.senha, { timeout: 5000 });
    } else {
      result.login_status = 'no_password_field';
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_no_pwd.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }
    const submit2 = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Continuar"), button:has-text("Login")').first();
    if (await submit2.count()) await submit2.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press('Enter').catch(() => {});

    await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 45000 }).catch(() => {});

    if (!page.url().includes('mcad.tasso.dev.br')) {
      result.login_status = 'no_redirect_back';
      result.notes.push(`Did not redirect back. URL=${page.url()}`);
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_stuck.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }

    // Wait for the React app to fire its first authenticated request so we capture the token.
    const waitToken = Date.now();
    while (!capturedToken && Date.now() - waitToken < 15000) {
      await page.waitForTimeout(250);
    }

    result.token_fingerprint = jwtFingerprint(capturedToken);

    // Now use page.request to hit BFF endpoints (not page navigation — avoids triggering the app's logout flow).
    let meStatus = 0, mePermStatus = 0, meBody = null, mePermBody = null;
    if (capturedToken) {
      const t1 = Date.now();
      const meResp = await page.request.get(`${BFF_URL}/api/me`, {
        headers: { Authorization: `Bearer ${capturedToken}` },
        timeout: 30000,
      }).catch((e) => null);
      const dur1 = Date.now() - t1;
      if (meResp) {
        meStatus = meResp.status();
        try { meBody = await meResp.json(); } catch { meBody = { error: 'non-json' }; }
        logReq('GET', `${BFF_URL}/api/me`, meStatus, dur1, result.token_fingerprint, '[runner-fetch]');
      } else {
        logReq('GET', `${BFF_URL}/api/me`, 0, dur1, result.token_fingerprint, '[runner-fetch ERROR]');
      }

      const t2 = Date.now();
      const mePermResp = await page.request.get(`${BFF_URL}/api/me/permissions`, {
        headers: { Authorization: `Bearer ${capturedToken}` },
        timeout: 30000,
      }).catch((e) => null);
      const dur2 = Date.now() - t2;
      if (mePermResp) {
        mePermStatus = mePermResp.status();
        try { mePermBody = await mePermResp.json(); } catch { mePermBody = { error: 'non-json' }; }
        logReq('GET', `${BFF_URL}/api/me/permissions`, mePermStatus, dur2, result.token_fingerprint, '[runner-fetch]');
      } else {
        logReq('GET', `${BFF_URL}/api/me/permissions`, 0, dur2, result.token_fingerprint, '[runner-fetch ERROR]');
      }
    } else {
      result.notes.push('No Bearer token captured from outgoing requests within 15s');
    }

    // Compose evidence
    result.me_status = meStatus;
    result.me_permissions_status = mePermStatus;
    if (meBody?.subjectId && typeof meBody.subjectId === 'string') {
      result.me_subject_id_redacted = meBody.subjectId.slice(0, 4) + '***' + meBody.subjectId.slice(-2);
    }
    if (mePermStatus >= 200 && mePermStatus < 300 && mePermBody?.permissions) {
      const perms = Array.isArray(mePermBody.permissions) ? mePermBody.permissions : [];
      result.me_permissions = perms;
      result.me_permissions_count = perms.length;
      // role-match heuristic: presence of role-defining permission prefix
      const prefix = EXPECTED_ROLES[cred.hint];
      result.has_expected_permissions = perms.length > 0 && (prefix ? perms.some(p => p?.startsWith?.(prefix.split('.')[0] + ':')) : null);
    } else if (mePermStatus !== 0) {
      result.me_error_body = mePermBody;
    }

    result.login_status = mePermStatus === 200 ? 'ok' : 'me_permissions_failed';

    // Persist /api/me + /api/me/permissions evidence (redacted)
    const redacted = {
      _captured_at: new Date().toISOString(),
      _hint: cred.hint,
      _bff_me_status: meStatus,
      _bff_me_permissions_status: mePermStatus,
      _jwt_fingerprint: result.token_fingerprint,
      me_subjectId_redacted: result.me_subject_id_redacted,
      me_name: meBody?.name || null,
      me_email_redacted: meBody?.email ? meBody.email.replace(/(.{2}).+(@.+)/, '$1***$2') : null,
      permissions: result.me_permissions,
      permissions_count: result.me_permissions_count,
      version: mePermBody?.version || null,
      error_body: mePermStatus !== 200 ? mePermBody : null,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, `me_${cred.hint}.json`), JSON.stringify(redacted, null, 2));

    // Take home screenshot at /distribuicao/processos for context
    try {
      await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch {}
    await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}.png`), fullPage: false }).catch(() => {});
  } catch (e) {
    result.notes.push(`Exception: ${e.message}`);
    await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_error.png`), fullPage: true }).catch(() => {});
  } finally {
    result.duration_ms = Date.now() - t0;
    result._context = context;
    result._page = page;
    result._token = capturedToken;
  }

  return result;
}

async function createProcessoAsOperador(loginResult, seq) {
  const page = loginResult._page;
  const out = { seq, id: null, status: null, errors: [], screenshot: null, http_calls: [] };
  const t0 = Date.now();
  try {
    await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Capture create POST
    const reqsToDistribuicao = [];
    const respHandler = (resp) => {
      const u = resp.url();
      if (u.includes('/distribuicao/v1/processos') || u.includes('distribuicao/v1/processos')) {
        reqsToDistribuicao.push({ method: resp.request().method(), url: u, status: resp.status() });
      }
    };
    page.on('response', respHandler);

    const btn = page.locator('button:has-text("Criar"), a:has-text("Criar"), button:has-text("Novo"), button:has-text("Nova")').first();
    if (!(await btn.count())) {
      out.errors.push('No "Criar" / "Novo" button found on /distribuicao/processos');
      await page.screenshot({ path: path.join(SHOTS_DIR, `processo_seed_${seq}_no_button.png`), fullPage: true }).catch(() => {});
      page.off('response', respHandler);
      return out;
    }
    await btn.click().catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Identify form
    const dataAtual = new Date().toISOString().slice(0, 10);
    const nomeProc = `Processo QA Preflight #${seq} ${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '_')}`;
    const candidates = [
      { sel: 'input[name="nome"], input[placeholder*="nome" i]', value: nomeProc },
      { sel: 'input[name="descricao"], textarea[name="descricao"], input[placeholder*="descri" i], textarea[placeholder*="descri" i]', value: 'Seed criado pelo QA Task Runner para validacao de US-03 historico' },
      { sel: 'input[type="date"]', value: dataAtual },
      { sel: 'input[name*="rubrica" i]', value: '01' },
    ];
    for (const c of candidates) {
      const loc = page.locator(c.sel).first();
      if (await loc.count()) {
        await loc.fill(c.value, { timeout: 3000 }).catch(() => {});
      }
    }
    const selects = await page.locator('select').all();
    for (const s of selects) {
      const options = await s.locator('option').all();
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        if (val && val.length) {
          await s.selectOption(val).catch(() => {});
          break;
        }
      }
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, `processo_seed_${seq}_form.png`), fullPage: true }).catch(() => {});

    const submit = page.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Confirmar")').first();
    if (await submit.count()) {
      await submit.click().catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    }
    await page.waitForTimeout(2500);

    const url = page.url();
    const m = url.match(/processos\/([0-9a-f-]{8,})/i);
    if (m) out.id = m[1];

    const statusEl = page.locator('[data-testid="processo-status"], .status, [class*="status"]').first();
    if (await statusEl.count()) {
      out.status = (await statusEl.textContent())?.trim();
    }
    const shot = `processo_seed_${seq}_${out.id || 'noid'}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
    out.screenshot = shot;
    out.http_calls = reqsToDistribuicao;
    page.off('response', respHandler);
  } catch (e) {
    out.errors.push(`Exception: ${e.message}`);
    await page.screenshot({ path: path.join(SHOTS_DIR, `processo_seed_${seq}_error.png`), fullPage: true }).catch(() => {});
  }
  out.duration_ms = Date.now() - t0;
  return out;
}

async function main() {
  ensureDirs();
  const credsText = fs.readFileSync(CREDS_FILE, 'utf8');
  const creds = parseCreds(credsText);
  console.error(`[preflight] parsed ${creds.length} credential records`);

  console.error(`[preflight] launching chromium (headless=${HEADLESS})`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  let operadorLogin = null;
  for (const cred of creds) {
    console.error(`[preflight] logging in ${cred.hint} ...`);
    const r = await loginUser(browser, cred);
    results.push({
      hint: r.hint,
      email_redacted: r.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      login_status: r.login_status,
      me_status: r.me_status,
      me_permissions_status: r.me_permissions_status,
      me_permissions_count: r.me_permissions_count,
      me_permissions_sample: r.me_permissions ? r.me_permissions.slice(0, 6) : null,
      expected_role: r.expected_role,
      has_expected_permissions: r.has_expected_permissions,
      notes: r.notes,
      token_fingerprint: r.token_fingerprint,
      duration_ms: r.duration_ms,
      error_body: r.me_error_body,
    });
    if (cred.hint === 'operador.dev' && r.login_status === 'ok') {
      operadorLogin = r;
    } else {
      await r._context?.close().catch(() => {});
    }
  }

  const seeds = [];
  if (operadorLogin) {
    for (let i = 0; i < 2; i++) {
      console.error(`[preflight] seeding processo #${i + 1} ...`);
      const s = await createProcessoAsOperador(operadorLogin, i + 1);
      seeds.push(s);
    }
    await operadorLogin._context?.close().catch(() => {});
  } else {
    console.error('[preflight] WARN operador.dev not logged in; skipping seed step');
  }

  await browser.close();

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'preflight_results.json'), JSON.stringify({
    headless: HEADLESS,
    captured_at: new Date().toISOString(),
    base_url: BASE_URL,
    bff_url: BFF_URL,
    expected_roles: EXPECTED_ROLES,
    logins: results,
    seeds,
  }, null, 2));

  console.error('[preflight] DONE');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
