// Quick probe: try POST with valid schema to confirm domain-level rejection (snapshotRol missing)
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

async function main() {
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const operador = creds.find(c => c.hint === 'operador.dev');
  const browser = await chromium.launch({ headless: false, slowMo: 200, args: ['--no-sandbox'] });
  const op = await login(browser, operador);
  const payload = { rubricaSigla: 'TESTE', periodo: '2025-01' };
  const t0 = Date.now();
  const resp = await op.page.request.post(`${DIST}/api/v1/processos`, {
    headers: { Authorization: `Bearer ${op.token}`, 'Content-Type': 'application/json' },
    data: payload,
  });
  const dur = Date.now() - t0;
  const body = await resp.text();
  const out = { captured_at: new Date().toISOString(), payload, status: resp.status(), dur_ms: dur, body: body.slice(0, 800) };
  fs.writeFileSync(`${EVIDENCE_DIR}/criar_probe_valid_schema_v4.json`, JSON.stringify(out, null, 2));
  console.error('status=', resp.status(), 'body=', body.slice(0, 200));
  await op.context.close();
  await browser.close();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
