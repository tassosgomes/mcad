// QA Preflight runner v3 — qa_task_00_v2
// - Re-validates the 6 users now that catalog/assignments are seeded
// - Seeds 2 Distribuicao processos as operador.dev (via UI when possible, API fallback)
// - Calculates both processos as operador.dev
// - Approves 1 processo as gerente.dev
// - Captures evidence (JSON + screenshots) without ever writing passwords to disk.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const SHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const REQ_LOG = path.join(EVIDENCE_DIR, 'requests_v2.log');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const DIST_URL = 'https://mcad-distribuicao.tasso.dev.br';

const EXPECTED_ROLES = {
  'consultor.dev':         'distribuicao.default.consultor',
  'operador.dev':          'distribuicao.default.operador',
  'gerente.dev':           'distribuicao.default.gerente',
  'analista.dev':          'distribuicao.default.analista',
  'gestor-acessos.dev':    'acessos.default.gestor',
  'consultor-acessos.dev': 'acessos.default.consultor',
};

// From orchestrator context (qa_task_00 v1 effective-permissions probes after seed apply)
const EXPECTED_PERM_COUNTS = {
  'consultor.dev':         40,
  'operador.dev':          9,
  'gerente.dev':           16,
  'analista.dev':          102,
  'gestor-acessos.dev':    7,
  'consultor-acessos.dev': 5,
};

const HEADLESS = process.env.HEADLESS === 'true' || !process.env.DISPLAY;

function ensureDirs() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

function logReq(method, url, status, durMs, jwtFp, note) {
  const line = `${new Date().toISOString()}\t${method}\t${url}\tstatus=${status}\tdur=${durMs}ms\tjwt=${jwtFp || '-'}\t${note || ''}\n`;
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

  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(BFF_URL)) {
      const auth = req.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ')) {
        const tok = auth.slice(7);
        if (!capturedToken) capturedToken = tok;
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
    expected_count: EXPECTED_PERM_COUNTS[cred.hint] || null,
    has_expected_permissions: null,
    count_matches_expected: null,
    notes: [],
    token_fingerprint: null,
    duration_ms: 0,
    _context: null,
    _page: null,
    _token: null,
  };

  const t0 = Date.now();
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForURL(/logto\.app/, { timeout: 30000 }).catch(() => {});

    if (!page.url().includes('logto.app')) {
      result.login_status = 'no_redirect_to_logto';
      result.notes.push(`Did not reach Logto. URL=${page.url()}`);
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2_no_logto.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }

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
      result.login_status = 'no_email_field';
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2_no_input.png`), fullPage: true }).catch(() => {});
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
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2_no_pwd.png`), fullPage: true }).catch(() => {});
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
      await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2_stuck.png`), fullPage: true }).catch(() => {});
      await context.close();
      return result;
    }

    // Wait for app's first authenticated request to capture token
    const waitToken = Date.now();
    while (!capturedToken && Date.now() - waitToken < 20000) {
      await page.waitForTimeout(250);
    }

    result.token_fingerprint = jwtFingerprint(capturedToken);

    let meStatus = 0, mePermStatus = 0, meBody = null, mePermBody = null;
    if (capturedToken) {
      const t1 = Date.now();
      const meResp = await page.request.get(`${BFF_URL}/api/me`, {
        headers: { Authorization: `Bearer ${capturedToken}` },
        timeout: 30000,
      }).catch(() => null);
      const dur1 = Date.now() - t1;
      if (meResp) {
        meStatus = meResp.status();
        try { meBody = await meResp.json(); } catch { meBody = { error: 'non-json' }; }
        logReq('GET', `${BFF_URL}/api/me`, meStatus, dur1, result.token_fingerprint, 'v2');
      }

      const t2 = Date.now();
      const mePermResp = await page.request.get(`${BFF_URL}/api/me/permissions`, {
        headers: { Authorization: `Bearer ${capturedToken}` },
        timeout: 30000,
      }).catch(() => null);
      const dur2 = Date.now() - t2;
      if (mePermResp) {
        mePermStatus = mePermResp.status();
        try { mePermBody = await mePermResp.json(); } catch { mePermBody = { error: 'non-json' }; }
        logReq('GET', `${BFF_URL}/api/me/permissions`, mePermStatus, dur2, result.token_fingerprint, 'v2');
      }
    } else {
      result.notes.push('No Bearer token captured within 20s');
    }

    result.me_status = meStatus;
    result.me_permissions_status = mePermStatus;
    if (meBody?.subjectId && typeof meBody.subjectId === 'string') {
      result.me_subject_id_redacted = meBody.subjectId.slice(0, 4) + '***' + meBody.subjectId.slice(-2);
    }
    if (mePermStatus >= 200 && mePermStatus < 300 && mePermBody?.permissions) {
      const perms = Array.isArray(mePermBody.permissions) ? mePermBody.permissions : [];
      result.me_permissions = perms;
      result.me_permissions_count = perms.length;
      const prefix = EXPECTED_ROLES[cred.hint];
      result.has_expected_permissions = perms.length > 0 && (prefix ? perms.some(p => p?.startsWith?.(prefix.split('.')[0] + ':')) : null);
      result.count_matches_expected = result.expected_count ? (perms.length === result.expected_count) : null;
    } else if (mePermStatus !== 0) {
      result.me_error_body = mePermBody;
    }

    result.login_status = mePermStatus === 200 ? 'ok' : 'me_permissions_failed';

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
      expected_role: result.expected_role,
      expected_count: result.expected_count,
      has_expected_permissions: result.has_expected_permissions,
      count_matches_expected: result.count_matches_expected,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, `me_${cred.hint}_v2.json`), JSON.stringify(redacted, null, 2));

    // Home screenshot
    try {
      await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2500);
    } catch {}
    await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2.png`), fullPage: false }).catch(() => {});
  } catch (e) {
    result.notes.push(`Exception: ${e.message}`);
    await page.screenshot({ path: path.join(SHOTS_DIR, `login_${cred.hint}_v2_error.png`), fullPage: true }).catch(() => {});
  } finally {
    result.duration_ms = Date.now() - t0;
    result._context = context;
    result._page = page;
    result._token = capturedToken;
  }

  return result;
}

// Fallback: discover schema by calling distribuicao API with bearer token from BFF passthrough
async function tryCreateProcessoApiFallback(page, token, seq) {
  // First check what API endpoint and shape the BFF or distribuicao service expects.
  // Best-effort POST to /api/v1/processos with minimal common payload.
  const url = `${DIST_URL}/api/v1/processos`;
  const payload = {
    nome: `Processo QA Preflight v2 #${seq}`,
    descricao: `Seed criado pelo QA Task Runner v2 para validacao de US-03 historico (seq ${seq})`,
    competencia: new Date().toISOString().slice(0, 7),
    data_referencia: new Date().toISOString().slice(0, 10),
  };
  const t1 = Date.now();
  const resp = await page.request.post(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: payload,
    timeout: 30000,
  }).catch((e) => ({ status: () => 0, statusText: () => e.message, _err: e }));
  const dur = Date.now() - t1;
  let body = null;
  try { body = resp && resp.json ? await resp.json() : null; } catch {}
  const status = typeof resp.status === 'function' ? resp.status() : 0;
  logReq('POST', url, status, dur, jwtFingerprint(token), `[api-fallback seq=${seq}]`);
  return { status, body, payload };
}

async function createProcessoViaUI(page, seq) {
  const out = {
    seq,
    method: 'ui',
    id: null,
    status: null,
    errors: [],
    screenshots: [],
    http_calls: [],
    duration_ms: 0,
  };
  const t0 = Date.now();
  try {
    await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const respHandler = (resp) => {
      const u = resp.url();
      if (/processos/i.test(u) && /distribuicao/i.test(u)) {
        out.http_calls.push({ method: resp.request().method(), url: u, status: resp.status() });
      }
    };
    page.on('response', respHandler);

    // Try a series of button selectors
    const btnSelectors = [
      'button:has-text("Criar Processo")',
      'a:has-text("Criar Processo")',
      'button:has-text("Novo Processo")',
      'a:has-text("Novo Processo")',
      'button:has-text("Criar")',
      'a:has-text("Criar")',
      'button:has-text("Novo")',
      'button:has-text("Nova")',
      '[data-testid*="criar" i]',
      '[data-testid*="novo" i]',
    ];
    let btn = null;
    for (const sel of btnSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) { btn = loc; break; }
    }
    if (!btn) {
      const shot = `processo_seed_${seq}_no_button.png`;
      await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
      out.screenshots.push(shot);
      out.errors.push('No create button found on /distribuicao/processos');
      page.off('response', respHandler);
      return out;
    }
    await btn.click().catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const shotForm = `processo_seed_${seq}_form.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shotForm), fullPage: true }).catch(() => {});
    out.screenshots.push(shotForm);

    // Fill any visible inputs/textarea generically
    const nomeProc = `Processo QA Preflight v2 #${seq} ${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '_')}`;
    const dataAtual = new Date().toISOString().slice(0, 10);
    const competencia = new Date().toISOString().slice(0, 7);

    const fillCandidates = [
      { sel: 'input[name="nome"], input[placeholder*="nome" i], input[id*="nome" i]', value: nomeProc },
      { sel: 'input[name="descricao"], textarea[name="descricao"], textarea[id*="descri" i], textarea[placeholder*="descri" i], input[placeholder*="descri" i]', value: `Seed QA v2 #${seq} US-03` },
      { sel: 'input[name="competencia"], input[placeholder*="compet" i], input[id*="compet" i]', value: competencia },
      { sel: 'input[type="month"]', value: competencia },
      { sel: 'input[type="date"]', value: dataAtual },
      { sel: 'input[name*="referencia" i]', value: dataAtual },
      { sel: 'input[name*="rubrica" i]', value: '01' },
    ];
    for (const c of fillCandidates) {
      const loc = page.locator(c.sel).first();
      if (await loc.count()) {
        await loc.fill(c.value, { timeout: 3000 }).catch(() => {});
      }
    }

    // Select all selects to first non-empty option
    const selects = await page.locator('select').all();
    for (const s of selects) {
      const opts = await s.locator('option').all();
      for (const opt of opts) {
        const val = await opt.getAttribute('value');
        if (val && val.length) {
          await s.selectOption(val).catch(() => {});
          break;
        }
      }
    }

    const shotFilled = `processo_seed_${seq}_form_filled.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shotFilled), fullPage: true }).catch(() => {});
    out.screenshots.push(shotFilled);

    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Salvar")',
      'button:has-text("Criar Processo")',
      'button:has-text("Criar")',
      'button:has-text("Confirmar")',
      'button:has-text("Enviar")',
    ];
    let submit = null;
    for (const sel of submitSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) { submit = loc; break; }
    }
    if (submit) {
      await submit.click().catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    } else {
      out.errors.push('No submit button found');
    }

    // Try to detect ID via URL or list refresh
    const url = page.url();
    const m = url.match(/processos\/([0-9a-f-]{8,})/i);
    if (m) out.id = m[1];

    // Status detector
    const statusSelectors = [
      '[data-testid="processo-status"]',
      '[data-testid*="status" i]',
      'span[class*="status" i]',
      'div[class*="status" i]',
    ];
    for (const ss of statusSelectors) {
      const loc = page.locator(ss).first();
      if (await loc.count()) {
        out.status = (await loc.textContent())?.trim();
        if (out.status) break;
      }
    }

    const finalShot = `processo_seed_${seq}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, finalShot), fullPage: true }).catch(() => {});
    out.screenshots.push(finalShot);

    page.off('response', respHandler);
  } catch (e) {
    out.errors.push(`Exception: ${e.message}`);
    const shot = `processo_seed_${seq}_error.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
    out.screenshots.push(shot);
  }
  out.duration_ms = Date.now() - t0;
  return out;
}

async function calcularProcesso(page, processoId, seq) {
  const out = { seq, processoId, action: 'calcular', success: false, screenshot: null, errors: [], http_calls: [], duration_ms: 0 };
  const t0 = Date.now();
  try {
    const url = processoId
      ? `${BASE_URL}/distribuicao/processos/${processoId}`
      : `${BASE_URL}/distribuicao/processos`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const respHandler = (resp) => {
      const u = resp.url();
      if (/processos/i.test(u) && /distribuicao/i.test(u)) {
        out.http_calls.push({ method: resp.request().method(), url: u, status: resp.status() });
      }
    };
    page.on('response', respHandler);

    // If we don't have an ID, try clicking the first row
    if (!processoId) {
      const rowLink = page.locator('a[href*="/distribuicao/processos/"]').first();
      if (await rowLink.count()) {
        await rowLink.click().catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const m = page.url().match(/processos\/([0-9a-f-]{8,})/i);
        if (m) out.processoId = m[1];
      }
    }

    const btnSelectors = [
      'button:has-text("Calcular")',
      'a:has-text("Calcular")',
      '[data-testid*="calcular" i]',
    ];
    let btn = null;
    for (const sel of btnSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) { btn = loc; break; }
    }
    if (!btn) {
      out.errors.push('No Calcular button visible');
      const shot = `processo_calcular_${seq}_no_button.png`;
      await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
      out.screenshot = shot;
      page.off('response', respHandler);
      return out;
    }
    await btn.click().catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Possible confirm modal
    const confirm = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("OK")').first();
    if (await confirm.count()) {
      await confirm.click().catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    const shot = `processo_calcular_${seq}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
    out.screenshot = shot;
    out.success = true;
    page.off('response', respHandler);
  } catch (e) {
    out.errors.push(`Exception: ${e.message}`);
  }
  out.duration_ms = Date.now() - t0;
  return out;
}

async function aprovarProcesso(page, processoId) {
  const out = { processoId, action: 'aprovar', success: false, screenshot: null, errors: [], http_calls: [], duration_ms: 0 };
  const t0 = Date.now();
  try {
    const url = processoId
      ? `${BASE_URL}/distribuicao/processos/${processoId}`
      : `${BASE_URL}/distribuicao/processos`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const respHandler = (resp) => {
      const u = resp.url();
      if (/processos/i.test(u) && /distribuicao/i.test(u)) {
        out.http_calls.push({ method: resp.request().method(), url: u, status: resp.status() });
      }
    };
    page.on('response', respHandler);

    if (!processoId) {
      const rowLink = page.locator('a[href*="/distribuicao/processos/"]').first();
      if (await rowLink.count()) {
        await rowLink.click().catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const m = page.url().match(/processos\/([0-9a-f-]{8,})/i);
        if (m) out.processoId = m[1];
      }
    }

    const btnSelectors = [
      'button:has-text("Aprovar")',
      'a:has-text("Aprovar")',
      '[data-testid*="aprovar" i]',
    ];
    let btn = null;
    for (const sel of btnSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) { btn = loc; break; }
    }
    if (!btn) {
      out.errors.push('No Aprovar button visible');
      const shot = `processo_aprovado_no_button.png`;
      await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
      out.screenshot = shot;
      page.off('response', respHandler);
      return out;
    }
    await btn.click().catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const confirm = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("OK")').first();
    if (await confirm.count()) {
      await confirm.click().catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    const shot = `processo_aprovado.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
    out.screenshot = shot;
    out.success = true;
    page.off('response', respHandler);
  } catch (e) {
    out.errors.push(`Exception: ${e.message}`);
  }
  out.duration_ms = Date.now() - t0;
  return out;
}

async function main() {
  ensureDirs();
  const credsText = fs.readFileSync(CREDS_FILE, 'utf8');
  const creds = parseCreds(credsText);
  console.error(`[v2] parsed ${creds.length} credential records`);

  console.error(`[v2] launching chromium (headless=${HEADLESS})`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  let operadorLogin = null;
  let gerenteLogin = null;

  for (const cred of creds) {
    console.error(`[v2] login ${cred.hint} ...`);
    const r = await loginUser(browser, cred);
    results.push({
      hint: r.hint,
      email_redacted: r.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      login_status: r.login_status,
      me_status: r.me_status,
      me_permissions_status: r.me_permissions_status,
      me_permissions_count: r.me_permissions_count,
      expected_role: r.expected_role,
      expected_count: r.expected_count,
      has_expected_permissions: r.has_expected_permissions,
      count_matches_expected: r.count_matches_expected,
      notes: r.notes,
      token_fingerprint: r.token_fingerprint,
      duration_ms: r.duration_ms,
      error_body: r.me_error_body,
    });
    if (cred.hint === 'operador.dev' && r.login_status === 'ok') {
      operadorLogin = r;
    } else if (cred.hint === 'gerente.dev' && r.login_status === 'ok') {
      gerenteLogin = r;
    } else {
      await r._context?.close().catch(() => {});
    }
  }

  const seeds = [];
  const calcs = [];
  let approval = null;

  if (operadorLogin) {
    for (let i = 1; i <= 2; i++) {
      console.error(`[v2] seeding processo ${i} via UI ...`);
      const s = await createProcessoViaUI(operadorLogin._page, i);
      // If UI didn't yield an ID, try API fallback
      if (!s.id && operadorLogin._token) {
        console.error(`[v2] UI did not yield id for seed ${i}; trying API fallback`);
        const fb = await tryCreateProcessoApiFallback(operadorLogin._page, operadorLogin._token, i);
        s.api_fallback = fb;
        if (fb.body && (fb.body.id || fb.body.processoId)) s.id = fb.body.id || fb.body.processoId;
        if (fb.body && (fb.body.status || fb.body.situacao)) s.status = fb.body.status || fb.body.situacao;
        s.method = 'api_fallback';
      }
      seeds.push(s);
    }

    // Calcular both
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      console.error(`[v2] calcular processo seq=${s.seq} id=${s.id || '(none)'} ...`);
      const c = await calcularProcesso(operadorLogin._page, s.id, s.seq);
      calcs.push(c);
    }

    await operadorLogin._context?.close().catch(() => {});
  } else {
    console.error('[v2] operador.dev login failed; cannot seed processos');
  }

  if (gerenteLogin) {
    // Pick the first processo with an id, or just first row of list
    const firstId = (seeds.find(s => s.id) || {}).id || null;
    console.error(`[v2] aprovar processo id=${firstId || '(first-in-list)'} ...`);
    approval = await aprovarProcesso(gerenteLogin._page, firstId);
    await gerenteLogin._context?.close().catch(() => {});
  } else {
    console.error('[v2] gerente.dev login failed; cannot approve processo');
  }

  await browser.close();

  const payload = {
    headless: HEADLESS,
    captured_at: new Date().toISOString(),
    base_url: BASE_URL,
    bff_url: BFF_URL,
    expected_roles: EXPECTED_ROLES,
    expected_perm_counts: EXPECTED_PERM_COUNTS,
    logins: results,
    seeds,
    calcs,
    approval,
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'preflight_results_v2.json'), JSON.stringify(payload, null, 2));

  // Write seed_processos.json as a simpler, focused artifact
  const seedSummary = seeds.map((s) => ({
    seq: s.seq,
    id: s.id || null,
    method: s.method,
    status: s.status || null,
    errors: s.errors,
    screenshots: s.screenshots,
    duration_ms: s.duration_ms,
  }));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'seed_processos.json'), JSON.stringify({
    captured_at: new Date().toISOString(),
    seeded_by: 'operador.dev@mcad.local',
    approved_by: gerenteLogin ? 'gerente.dev@mcad.local' : null,
    seeds: seedSummary,
    calcs: calcs.map(c => ({ seq: c.seq, processoId: c.processoId, success: c.success, errors: c.errors, screenshot: c.screenshot, duration_ms: c.duration_ms })),
    approval: approval ? {
      processoId: approval.processoId,
      success: approval.success,
      errors: approval.errors,
      screenshot: approval.screenshot,
      duration_ms: approval.duration_ms,
    } : null,
  }, null, 2));

  console.error('[v2] DONE');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
