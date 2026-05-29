// qa_task_00 v3 - diagnostic: capture operador token and probe distribuicao-api endpoints
import { chromium } from 'playwright';
import fs from 'fs';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';
const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const DIST = 'https://mcad-distribuicao.tasso.dev.br';

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

async function login(browser, cred) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  let token = null;
  page.on('request', (req) => {
    if (req.url().startsWith(BFF_URL) || req.url().startsWith(DIST)) {
      const auth = req.headers()['authorization'];
      if (auth?.startsWith('Bearer ') && !token) token = auth.slice(7);
    }
  });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/logto\.app/, { timeout: 30000 });
  const emailSel = ['input[name="identifier"]', 'input[type="email"]', 'input[name="email"]'];
  for (const s of emailSel) {
    const loc = page.locator(s).first();
    if (await loc.count()) { await loc.fill(cred.email); break; }
  }
  await page.locator('button[type="submit"]').first().click().catch(() => page.keyboard.press('Enter'));
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.locator('input[type="password"]').first().fill(cred.senha);
  await page.locator('button[type="submit"]').first().click().catch(() => page.keyboard.press('Enter'));
  await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 45000 });
  await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const t0 = Date.now();
  while (!token && Date.now() - t0 < 20000) await page.waitForTimeout(250);
  return { context, page, token };
}

async function probe(session, label) {
  const urls = [
    `${DIST}/api/v1/processos`,
    `${DIST}/api/v1/processos/disponiveis`,
    `${DIST}/api/v1/rubricas`,
    `${DIST}/actuator/health`,
    `${DIST}/actuator/info`,
    `${DIST}/actuator/mappings`,
    `${BFF_URL}/api/distribuicao/v1/processos`,
    `${BFF_URL}/api/distribuicao/v1/processos/disponiveis`,
    `${BFF_URL}/api/distribuicao/v1/rubricas`,
  ];
  const results = [];
  for (const url of urls) {
    const t = Date.now();
    const r = await session.page.request.get(url, {
      headers: { Authorization: `Bearer ${session.token}` }, timeout: 15000,
    }).catch((e) => ({ status: () => 0, _err: e?.message }));
    const dur = Date.now() - t;
    const status = typeof r.status === 'function' ? r.status() : 0;
    let body = null;
    try { body = await r.text(); } catch {}
    const sample = body ? body.slice(0, 200) : null;
    results.push({ url, status, dur_ms: dur, sample });
  }
  return results;
}

async function main() {
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const operador = creds.find(c => c.hint === 'operador.dev');
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--no-sandbox'] });
  const op = await login(browser, operador);
  console.error('op token=', op.token ? '...' + op.token.slice(-6) : '-');
  const r = await probe(op, 'operador');
  fs.writeFileSync(`${EVIDENCE_DIR}/diag_distribuicao_v3.json`, JSON.stringify({
    captured_at: new Date().toISOString(),
    user: 'operador.dev',
    token_fp: op.token ? '...' + op.token.slice(-6) : null,
    probes: r,
  }, null, 2));
  for (const x of r) console.error(x.status, x.url, '-', x.sample?.slice(0, 80));
  await op.context.close();
  await browser.close();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
