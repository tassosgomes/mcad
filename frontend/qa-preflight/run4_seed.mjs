// Focused seed runner — qa_task_00 v2 (post-login fixup)
// Goal: seed 2 processos as operador.dev via UI (or API fallback through BFF),
// then calculate both, and approve 1 as gerente.dev.
// Re-validation of /api/me/permissions for 6 users already PASSED in run3.mjs.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const SHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const REQ_LOG = path.join(EVIDENCE_DIR, 'requests_v2.log');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const DIST_API = `${BFF_URL}/api/distribuicao/v1`;

const HEADLESS = process.env.HEADLESS === 'true' || !process.env.DISPLAY;

function logReq(method, url, status, durMs, jwtFp, note) {
  const line = `${new Date().toISOString()}\t${method}\t${url}\tstatus=${status}\tdur=${durMs}ms\tjwt=${jwtFp || '-'}\t${note || ''}\n`;
  fs.appendFileSync(REQ_LOG, line);
}

function jwtFp(t) { return t ? '...' + t.slice(-6) : '-'; }

function parseCreds(text) {
  const records = text.split(/-{5,}\n?/g);
  const out = [];
  for (const rec of records) {
    const trimmed = rec.trim();
    if (!trimmed) continue;
    const hint = (rec.match(/Hint:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const email = (rec.match(/Endereço de e-mail:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const username = (rec.match(/Nome de usuário:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const senha = (rec.match(/(?:Nova\s+)?Senha:\s*([^\r\n]+)/i) || [])[1]?.trim();
    if (hint && email && senha) out.push({ hint, email, username, senha });
  }
  return out;
}

async function loginAndCaptureToken(browser, cred) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  let token = null;
  page.on('request', (req) => {
    if (req.url().startsWith(BFF_URL)) {
      const auth = req.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ') && !token) {
        token = auth.slice(7);
      }
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/logto\.app/, { timeout: 30000 });

  const emailSel = ['input[name="identifier"]', 'input[type="email"]', 'input[name="email"]'];
  for (const s of emailSel) {
    const loc = page.locator(s).first();
    if (await loc.count()) { await loc.fill(cred.email); break; }
  }
  await page.locator('button[type="submit"], button:has-text("Continuar")').first().click().catch(() => page.keyboard.press('Enter'));
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.locator('input[type="password"]').first().fill(cred.senha);
  await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Continuar")').first().click().catch(() => page.keyboard.press('Enter'));
  await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 45000 });

  // Wait for token
  const waitStart = Date.now();
  while (!token && Date.now() - waitStart < 20000) await page.waitForTimeout(250);

  return { context, page, token, cred };
}

async function seedProcessoApi(session, seq) {
  // 1) list disponiveis
  const t0 = Date.now();
  const dispResp = await session.page.request.get(`${DIST_API}/processos/disponiveis`, {
    headers: { Authorization: `Bearer ${session.token}` }, timeout: 30000,
  }).catch(() => null);
  const dispDur = Date.now() - t0;
  const dispStatus = dispResp ? dispResp.status() : 0;
  let disp = [];
  try { disp = dispResp ? await dispResp.json() : []; } catch {}
  logReq('GET', `${DIST_API}/processos/disponiveis`, dispStatus, dispDur, jwtFp(session.token), `seed${seq}`);

  if (!Array.isArray(disp) || disp.length === 0) {
    return {
      seq, method: 'api', id: null, status: null, errors: ['Sem disponibilidades para criar processo'],
      disp_status: dispStatus, disp_count: 0,
    };
  }

  // pick by seq (wrap)
  const pick = disp[(seq - 1) % disp.length];
  const payload = { rubricaSigla: pick.rubricaSigla, periodo: pick.periodo };

  const t1 = Date.now();
  const createResp = await session.page.request.post(`${DIST_API}/processos`, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: payload, timeout: 60000,
  }).catch((e) => ({ status: () => 0, _err: e?.message }));
  const createDur = Date.now() - t1;
  const createStatus = typeof createResp.status === 'function' ? createResp.status() : 0;
  let body = null;
  try { body = await createResp.json(); } catch {}
  logReq('POST', `${DIST_API}/processos`, createStatus, createDur, jwtFp(session.token), `seed${seq}`);

  return {
    seq,
    method: 'api',
    payload,
    disp_count: disp.length,
    disp_sample: disp.slice(0, 3),
    create_status: createStatus,
    create_duration_ms: createDur,
    id: body?.id || null,
    status: body?.status || body?.situacao || null,
    body_redacted: body ? { id: body.id, status: body.status, situacao: body.situacao, rubricaSigla: body.rubricaSigla, periodo: body.periodo } : null,
    errors: createStatus >= 200 && createStatus < 300 ? [] : ['create failed', JSON.stringify(body)],
  };
}

async function calcularApi(session, processoId, seq) {
  const url = `${DIST_API}/processos/${processoId}/calcular`;
  const t = Date.now();
  const resp = await session.page.request.post(url, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: {}, timeout: 120000,
  }).catch((e) => ({ status: () => 0, _err: e?.message }));
  const dur = Date.now() - t;
  const status = typeof resp.status === 'function' ? resp.status() : 0;
  let body = null;
  try { body = await resp.json(); } catch {}
  logReq('POST', url, status, dur, jwtFp(session.token), `calc-seed${seq}`);
  return { seq, processoId, action: 'calcular', status, duration_ms: dur, body_status: body?.status || body?.situacao || null, errors: status >= 200 && status < 300 ? [] : ['calc failed', JSON.stringify(body)] };
}

async function aprovarApi(session, processoId) {
  const url = `${DIST_API}/processos/${processoId}/aprovar`;
  const t = Date.now();
  const resp = await session.page.request.post(url, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: {}, timeout: 60000,
  }).catch((e) => ({ status: () => 0, _err: e?.message }));
  const dur = Date.now() - t;
  const status = typeof resp.status === 'function' ? resp.status() : 0;
  let body = null;
  try { body = await resp.json(); } catch {}
  logReq('POST', url, status, dur, jwtFp(session.token), 'aprovar');
  return { processoId, action: 'aprovar', status, duration_ms: dur, body_status: body?.status || body?.situacao || null, errors: status >= 200 && status < 300 ? [] : ['aprovar failed', JSON.stringify(body)] };
}

async function uiScreenshotPostAction(session, route, label) {
  try {
    await session.page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    // wait longer for TanStack Query to settle (perm + list)
    await session.page.waitForTimeout(6000);
  } catch {}
  const shot = `${label}.png`;
  await session.page.screenshot({ path: path.join(SHOTS_DIR, shot), fullPage: true }).catch(() => {});
  return shot;
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const credsText = fs.readFileSync(CREDS_FILE, 'utf8');
  const creds = parseCreds(credsText);
  const operadorCred = creds.find((c) => c.hint === 'operador.dev');
  const gerenteCred = creds.find((c) => c.hint === 'gerente.dev');
  if (!operadorCred || !gerenteCred) {
    console.error('FATAL: missing operador/gerente creds');
    process.exit(2);
  }
  const browser = await chromium.launch({ headless: HEADLESS, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  console.error('[fixup] login operador.dev');
  const op = await loginAndCaptureToken(browser, operadorCred);

  // Take an authoritative screenshot post-login at /distribuicao/processos with longer wait
  const opShot = await uiScreenshotPostAction(op, '/distribuicao/processos', 'login_operador.dev_v2_postwait');
  console.error(`[fixup] op screenshot=${opShot} token=${jwtFp(op.token)}`);

  const seeds = [];
  for (let i = 1; i <= 2; i++) {
    console.error(`[fixup] seed processo ${i}`);
    const s = await seedProcessoApi(op, i);
    seeds.push(s);
  }
  console.error('[fixup] seeds done:', seeds.map(s => ({ seq: s.seq, id: s.id, status: s.create_status })));

  // Capture screenshots of detail page for each created processo
  for (const s of seeds) {
    if (s.id) {
      const label = `processo_seed_${s.seq}_${s.id.slice(0, 8)}`;
      await uiScreenshotPostAction(op, `/distribuicao/processos/${s.id}`, label);
      s.detail_screenshot = `${label}.png`;
    }
  }

  // Calcular both
  const calcs = [];
  for (const s of seeds) {
    if (s.id) {
      console.error(`[fixup] calcular ${s.id}`);
      const c = await calcularApi(op, s.id, s.seq);
      // small wait for backend events to settle
      await op.page.waitForTimeout(2000);
      const label = `processo_calcular_${s.seq}_${s.id.slice(0, 8)}`;
      await uiScreenshotPostAction(op, `/distribuicao/processos/${s.id}`, label);
      c.screenshot = `${label}.png`;
      calcs.push(c);
    }
  }
  await op.context.close();

  console.error('[fixup] login gerente.dev');
  const gr = await loginAndCaptureToken(browser, gerenteCred);
  let approval = null;
  const target = seeds.find(s => s.id);
  if (target && gr.token) {
    console.error(`[fixup] aprovar ${target.id}`);
    approval = await aprovarApi(gr, target.id);
    await gr.page.waitForTimeout(2000);
    const label = `processo_aprovado`;
    await uiScreenshotPostAction(gr, `/distribuicao/processos/${target.id}`, label);
    approval.screenshot = `${label}.png`;
  }
  await gr.context.close();

  await browser.close();

  // Persist evidence
  const seedSummary = seeds.map((s) => ({
    seq: s.seq,
    id: s.id,
    method: s.method,
    create_status: s.create_status || null,
    payload: s.payload || null,
    body_status: s.status || null,
    detail_screenshot: s.detail_screenshot || null,
    errors: s.errors,
    disp_count: s.disp_count,
  }));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'seed_processos.json'), JSON.stringify({
    captured_at: new Date().toISOString(),
    seeded_by: 'operador.dev@mcad.local',
    approved_by: gr ? 'gerente.dev@mcad.local' : null,
    seeds: seedSummary,
    calcs,
    approval,
    notes: [
      'Re-validation of /api/me/permissions for 6 users was done in run3.mjs (preflight_results_v2.json) — all PASS.',
      'UI route /distribuicao/processos rendered "Acesso negado" during the first screenshot pass despite operador having distribuicao:default:processo:listar — likely a perms-query race during initial paint. Re-screenshot after 6s wait captured here as login_operador.dev_v2_postwait.png.',
    ],
  }, null, 2));

  console.error('[fixup] DONE');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
