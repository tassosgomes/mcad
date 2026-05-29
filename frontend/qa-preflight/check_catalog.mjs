// Check ecad-authz roles catalog + assignments using analista.dev (authz super-admin).
// Captures the Bearer token from a fresh login and queries authz directly.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const REQ_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const AUTHZ_BASE_VIA_BFF = `${BFF_URL}/v1`;

function logReq(method, url, status, durMs, fp, note) {
  fs.appendFileSync(REQ_LOG, `${new Date().toISOString()}\t${method}\t${url}\tstatus=${status}\tdur=${durMs}ms\tjwt=${fp}\t${note || ''}\n`);
}

function fp(t) { return t ? '...' + t.slice(-6) : '-'; }

function parseCreds(text) {
  const records = text.split(/-{5,}\n?/g);
  const out = [];
  for (const rec of records) {
    const hint = (rec.match(/Hint:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const email = (rec.match(/Endereço de e-mail:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const senha = (rec.match(/(?:Nova\s+)?Senha:\s*([^\r\n]+)/i) || [])[1]?.trim();
    if (hint && email && senha) out.push({ hint, email, senha });
  }
  return out;
}

async function loginAndGetToken(browser, cred) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  let token = null;
  page.on('request', (req) => {
    if (req.url().startsWith(BFF_URL)) {
      const a = req.headers()['authorization'];
      if (a?.startsWith('Bearer ') && !token) token = a.slice(7);
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/logto\.app/, { timeout: 30000 }).catch(() => {});
  await page.locator('input[name="identifier"], input[type="email"], input[autocomplete="username"]').first().fill(cred.email).catch(() => {});
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForSelector('input[type="password"]', { timeout: 15000 }).catch(() => {});
  await page.locator('input[type="password"]').first().fill(cred.senha).catch(() => {});
  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 45000 }).catch(() => {});

  const t0 = Date.now();
  while (!token && Date.now() - t0 < 15000) {
    await page.waitForTimeout(250);
  }
  return { context, page, token };
}

async function authzGet(page, token, path, label) {
  const t0 = Date.now();
  const r = await page.request.get(`${AUTHZ_BASE_VIA_BFF}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  }).catch((e) => null);
  const dur = Date.now() - t0;
  if (!r) {
    logReq('GET', `${AUTHZ_BASE_VIA_BFF}${path}`, 0, dur, fp(token), `[${label}] ERROR`);
    return { status: 0, body: { error: 'fetch failed' } };
  }
  let body;
  try { body = await r.json(); } catch { body = await r.text().catch(() => '?'); }
  logReq('GET', `${AUTHZ_BASE_VIA_BFF}${path}`, r.status(), dur, fp(token), `[${label}]`);
  return { status: r.status(), body };
}

async function main() {
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const analista = creds.find(c => c.hint === 'analista.dev');
  if (!analista) { console.error('no analista.dev'); process.exit(1); }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  console.error('[catalog] login analista.dev (super-admin)');
  const { context, page, token } = await loginAndGetToken(browser, analista);
  if (!token) {
    console.error('[catalog] FATAL no token');
    await browser.close();
    process.exit(2);
  }

  const out = { captured_at: new Date().toISOString(), used_user: 'analista.dev', token_fingerprint: fp(token), calls: {} };

  // Standard ecad-authz endpoints (per BFF proxy: /v1/...). Try common shapes.
  const queries = [
    ['list_roles',                    '/roles'],
    ['list_roles_distribuicao',       '/roles?domain=distribuicao'],
    ['list_roles_acessos',            '/roles?domain=acessos'],
    ['list_permissions_distribuicao', '/permissions?domain=distribuicao'],
    ['list_permissions_acessos',      '/permissions?domain=acessos'],
    ['list_permissions_cadastro',     '/permissions?domain=cadastro'],
    ['list_users',                    '/users'],
    ['list_assignments',              '/user-roles'],
  ];

  for (const [label, p] of queries) {
    const r = await authzGet(page, token, p, label);
    out.calls[label] = {
      status: r.status,
      path: p,
      sample: typeof r.body === 'object' ? {
        keys: Array.isArray(r.body) ? `array[${r.body.length}]` : Object.keys(r.body).slice(0, 8),
        first: Array.isArray(r.body) ? r.body.slice(0, 3) : null,
      } : { text: String(r.body).slice(0, 200) },
      full: r.status === 200 ? r.body : r.body,
    };
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'authz_catalog_probe.json'), JSON.stringify(out, null, 2));
  console.error('[catalog] DONE');
  await context.close();
  await browser.close();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
