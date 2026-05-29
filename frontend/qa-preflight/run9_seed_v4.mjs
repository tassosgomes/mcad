// qa_task_00 v4 - try seed processos via UI + API; if disponiveis empty, screenshot evidence and POST attempt
import { chromium } from 'playwright';
import fs from 'fs';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const SHOTS = `${EVIDENCE_DIR}/screenshots`;
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
  fs.mkdirSync(SHOTS, { recursive: true });
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const operador = creds.find(c => c.hint === 'operador.dev');
  const browser = await chromium.launch({ headless: false, slowMo: 200, args: ['--no-sandbox'] });
  const op = await login(browser, operador);
  console.error('op token=', op.token ? '...' + op.token.slice(-6) : '-');

  const report = {
    captured_at: new Date().toISOString(),
    user: 'operador.dev',
    token_fp: op.token ? '...' + op.token.slice(-6) : null,
    playwright_mode: 'headed',
    steps: [],
    seeds: [],
  };

  // 1) Navigate to processos list (route already loaded)
  await op.page.screenshot({ path: `${SHOTS}/v4_processos_list.png`, fullPage: true });
  report.steps.push({ name: 'list_loaded', screenshot: 'v4_processos_list.png' });

  // 2) Try clicking "Criar Processo" / "Novo"
  await op.page.goto(`${BASE_URL}/distribuicao/processos/novo`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await op.page.waitForTimeout(2000);
  await op.page.screenshot({ path: `${SHOTS}/v4_processo_criar_form.png`, fullPage: true });
  report.steps.push({ name: 'criar_form_loaded', screenshot: 'v4_processo_criar_form.png' });

  // 3) Check disponiveis via API
  const dispResp = await op.page.request.get(`${DIST}/api/v1/processos/disponiveis`, {
    headers: { Authorization: `Bearer ${op.token}` },
  });
  const dispBody = await dispResp.text();
  let disponiveis = [];
  try { disponiveis = JSON.parse(dispBody); } catch {}
  report.steps.push({ name: 'list_disponiveis', status: dispResp.status(), count: Array.isArray(disponiveis) ? disponiveis.length : 0, body: dispBody.slice(0, 400) });

  // 4) Check rubricas via API
  const rubResp = await op.page.request.get(`${DIST}/api/v1/rubricas`, {
    headers: { Authorization: `Bearer ${op.token}` },
  });
  const rubBody = await rubResp.text();
  let rubricas = [];
  try { rubricas = JSON.parse(rubBody); } catch {}
  report.steps.push({ name: 'list_rubricas', status: rubResp.status(), count: Array.isArray(rubricas) ? rubricas.length : 0, body: rubBody.slice(0, 400) });

  // 5) If disponiveis count > 0, try seeding via UI (button "Criar"); otherwise try API direct with synthetic payload to confirm error
  if (Array.isArray(disponiveis) && disponiveis.length > 0) {
    for (let i = 0; i < Math.min(2, disponiveis.length); i++) {
      const d = disponiveis[i];
      const payload = { rubricaSigla: d.rubricaSigla, periodo: d.periodo };
      const t0 = Date.now();
      const resp = await op.page.request.post(`${DIST}/api/v1/processos`, {
        headers: { Authorization: `Bearer ${op.token}`, 'Content-Type': 'application/json' },
        data: payload,
      });
      const dur = Date.now() - t0;
      const body = await resp.text();
      let parsed = null;
      try { parsed = JSON.parse(body); } catch {}
      const seed = {
        seq: i + 1,
        payload,
        status: resp.status(),
        dur_ms: dur,
        body: body.slice(0, 400),
        id: parsed?.id || null,
      };
      report.seeds.push(seed);

      if (seed.id) {
        // try calcular
        const calcResp = await op.page.request.post(`${DIST}/api/v1/processos/${seed.id}/calcular`, {
          headers: { Authorization: `Bearer ${op.token}`, 'Content-Type': 'application/json' },
          data: {},
        });
        seed.calc_status = calcResp.status();
        seed.calc_body = (await calcResp.text()).slice(0, 400);
      }
    }
  } else {
    // No disponibilidades: try API direct with synthetic payload to capture the precise error
    const synth = { rubricaSigla: 'TESTE', periodo: '2025-Q1' };
    const t0 = Date.now();
    const resp = await op.page.request.post(`${DIST}/api/v1/processos`, {
      headers: { Authorization: `Bearer ${op.token}`, 'Content-Type': 'application/json' },
      data: synth,
    });
    const dur = Date.now() - t0;
    const body = await resp.text();
    report.seeds.push({
      seq: 'synthetic_probe',
      payload: synth,
      status: resp.status(),
      dur_ms: dur,
      body: body.slice(0, 800),
      note: 'Synthetic payload to confirm error path when no rubricas/snapshots exist',
    });
    report.steps.push({ name: 'no_disponiveis_no_processos_seeded', count: 0 });
  }

  fs.writeFileSync(`${EVIDENCE_DIR}/seed_processos_v4.json`, JSON.stringify(report, null, 2));
  for (const s of report.steps) console.error('STEP', s.name, s.count ?? s.status ?? '');
  for (const s of report.seeds) console.error('SEED', s.seq, 'status=', s.status, 'id=', s.id);
  await op.context.close();
  await browser.close();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
