// qa_task_00 v3 — HEADED seed runner
// Goal: post-redeploy of distribuicao-api + frontend, seed 2 processos as operador.dev,
// calcular both, and aprovar 1 as gerente.dev.
// Hard rule: HEADED browser (headless: false). If DISPLAY unavailable, abort.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const SHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const REQ_LOG = path.join(EVIDENCE_DIR, 'requests_v3.log');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';
const DIST_BFF = `${BFF_URL}/api/distribuicao/v1`;
const DIST_DIRECT = 'https://mcad-distribuicao.tasso.dev.br/api/v1';

if (!process.env.DISPLAY) {
  console.error('FATAL: DISPLAY not set — headed mode required.');
  process.exit(2);
}

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
    if (req.url().startsWith(BFF_URL) || req.url().startsWith(DIST_DIRECT)) {
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

  // Force a BFF call to ensure we capture a Bearer
  await page.goto(`${BASE_URL}/distribuicao/processos`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const waitStart = Date.now();
  while (!token && Date.now() - waitStart < 20000) await page.waitForTimeout(250);

  return { context, page, token, cred };
}

async function shot(session, label) {
  const file = `${label}.png`;
  await session.page.screenshot({ path: path.join(SHOTS_DIR, file), fullPage: true }).catch(() => {});
  return file;
}

async function getDisp(session, label) {
  const t = Date.now();
  let resp = await session.page.request.get(`${DIST_BFF}/processos/disponiveis`, {
    headers: { Authorization: `Bearer ${session.token}` }, timeout: 30000,
  }).catch(() => null);
  let dur = Date.now() - t;
  let status = resp ? resp.status() : 0;
  let body = null;
  try { body = resp ? await resp.json() : null; } catch {}
  logReq('GET', `${DIST_BFF}/processos/disponiveis`, status, dur, jwtFp(session.token), label);

  // also try direct
  if (!Array.isArray(body) || body.length === 0) {
    const t2 = Date.now();
    const r2 = await session.page.request.get(`${DIST_DIRECT}/processos/disponiveis`, {
      headers: { Authorization: `Bearer ${session.token}` }, timeout: 30000,
    }).catch(() => null);
    const dur2 = Date.now() - t2;
    const status2 = r2 ? r2.status() : 0;
    let body2 = null;
    try { body2 = r2 ? await r2.json() : null; } catch {}
    logReq('GET', `${DIST_DIRECT}/processos/disponiveis`, status2, dur2, jwtFp(session.token), `${label}-direct`);
    if (Array.isArray(body2) && body2.length > 0) {
      body = body2; status = status2;
    } else if (!body) {
      body = body2; status = status2;
    }
  }
  return { status, items: Array.isArray(body) ? body : [], raw: body };
}

async function createProcesso(session, payload, seq) {
  const t = Date.now();
  const resp = await session.page.request.post(`${DIST_BFF}/processos`, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: payload, timeout: 60000,
  }).catch((e) => ({ status: () => 0, _err: e?.message }));
  const dur = Date.now() - t;
  const status = typeof resp.status === 'function' ? resp.status() : 0;
  let body = null;
  try { body = await resp.json(); } catch {}
  logReq('POST', `${DIST_BFF}/processos`, status, dur, jwtFp(session.token), `seed${seq}`);

  // fallback direct
  if (status === 0 || status === 404 || status >= 500) {
    const t2 = Date.now();
    const r2 = await session.page.request.post(`${DIST_DIRECT}/processos`, {
      headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
      data: payload, timeout: 60000,
    }).catch((e) => ({ status: () => 0, _err: e?.message }));
    const dur2 = Date.now() - t2;
    const status2 = typeof r2.status === 'function' ? r2.status() : 0;
    let body2 = null;
    try { body2 = await r2.json(); } catch {}
    logReq('POST', `${DIST_DIRECT}/processos`, status2, dur2, jwtFp(session.token), `seed${seq}-direct`);
    if (status2 >= 200 && status2 < 300) return { status: status2, body: body2, duration_ms: dur2, via: 'direct' };
  }
  return { status, body, duration_ms: dur, via: 'bff' };
}

async function calcular(session, id, seq) {
  const url = `${DIST_BFF}/processos/${id}/calcular`;
  const t = Date.now();
  const resp = await session.page.request.post(url, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: {}, timeout: 120000,
  }).catch(() => null);
  const dur = Date.now() - t;
  const status = resp ? resp.status() : 0;
  let body = null;
  try { body = resp ? await resp.json() : null; } catch {}
  logReq('POST', url, status, dur, jwtFp(session.token), `calc-${seq}`);
  return { status, body, duration_ms: dur };
}

async function aprovar(session, id) {
  const url = `${DIST_BFF}/processos/${id}/aprovar`;
  const t = Date.now();
  const resp = await session.page.request.post(url, {
    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    data: {}, timeout: 60000,
  }).catch(() => null);
  const dur = Date.now() - t;
  const status = resp ? resp.status() : 0;
  let body = null;
  try { body = resp ? await resp.json() : null; } catch {}
  logReq('POST', url, status, dur, jwtFp(session.token), 'aprovar');
  return { status, body, duration_ms: dur };
}

async function gotoAndShot(session, route, label, waitMs = 4000) {
  try {
    await session.page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await session.page.waitForTimeout(waitMs);
  } catch {}
  return shot(session, label);
}

async function detectHistoricoTab(session, processoId) {
  try {
    await session.page.goto(`${BASE_URL}/distribuicao/processos/${processoId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await session.page.waitForTimeout(4000);
    const html = await session.page.content();
    const visible = /Hist[oó]rico de Altera[cç][oõ]es/i.test(html);
    return visible;
  } catch { return false; }
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  // truncate request log v3
  fs.writeFileSync(REQ_LOG, '');

  const credsText = fs.readFileSync(CREDS_FILE, 'utf8');
  const creds = parseCreds(credsText);
  const operadorCred = creds.find((c) => c.hint === 'operador.dev');
  const gerenteCred = creds.find((c) => c.hint === 'gerente.dev');
  if (!operadorCred || !gerenteCred) {
    console.error('FATAL: missing operador/gerente creds'); process.exit(2);
  }

  console.error('[v3] launching HEADED browser (slowMo=200)');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  // === SMOKE 1: gerente.dev navigates to /distribuicao/processos ===
  console.error('[v3] smoke login gerente.dev');
  const gerenteSmoke = await loginAndCaptureToken(browser, gerenteCred);
  console.error(`[v3] gerente token=${jwtFp(gerenteSmoke.token)}`);
  await gotoAndShot(gerenteSmoke, '/distribuicao/processos', 'v3_smoke_gerente', 5000);
  // Capture if "Acesso negado" appears
  const gerenteHtml = await gerenteSmoke.page.content();
  const gerenteDenied = /Acesso negado/i.test(gerenteHtml);
  console.error(`[v3] gerente denied=${gerenteDenied}`);
  await gerenteSmoke.context.close();

  // === Login operador.dev for seeding ===
  console.error('[v3] login operador.dev');
  const op = await loginAndCaptureToken(browser, operadorCred);
  console.error(`[v3] op token=${jwtFp(op.token)}`);

  // Open processos page and screenshot for confirmation of access
  await gotoAndShot(op, '/distribuicao/processos', 'v3_operador_processos_list', 5000);

  // === Disponiveis ===
  const disp = await getDisp(op, 'preseed');
  console.error(`[v3] disponiveis status=${disp.status} count=${disp.items.length}`);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'disponiveis_v3.json'), JSON.stringify(disp, null, 2));

  // === Try UI create flow once for screenshot, then API fallback for both ===
  await gotoAndShot(op, '/distribuicao/processos/novo', 'v3_processo_criar_1', 4000);

  const seeds = [];
  if (disp.items.length === 0) {
    // No disponiveis → cannot create. Record and continue.
    seeds.push({ seq: 1, id: null, errors: ['Sem disponibilidades para criar processo'], disp_count: 0 });
    seeds.push({ seq: 2, id: null, errors: ['Sem disponibilidades para criar processo'], disp_count: 0 });
  } else {
    for (let i = 0; i < Math.min(2, disp.items.length); i++) {
      const seq = i + 1;
      const pick = disp.items[i];
      const payload = { rubricaSigla: pick.rubricaSigla || pick.rubrica?.sigla, periodo: pick.periodo };
      console.error(`[v3] create processo ${seq} payload=${JSON.stringify(payload)}`);
      const res = await createProcesso(op, payload, seq);
      const id = res.body?.id || null;
      seeds.push({
        seq, id, payload,
        create_status: res.status,
        create_via: res.via,
        body_status: res.body?.status || null,
        duration_ms: res.duration_ms,
        errors: res.status >= 200 && res.status < 300 ? [] : ['create failed', JSON.stringify(res.body)],
      });
      if (id) {
        await gotoAndShot(op, `/distribuicao/processos/${id}`, `v3_processo_criado_${seq}`, 4000);
      }
      // brief settle
      await op.page.waitForTimeout(1500);
    }
    // If only one disponivel was provided we still need a second screenshot stub
    while (seeds.length < 2) seeds.push({ seq: seeds.length + 1, id: null, errors: ['no second disponivel'], disp_count: disp.items.length });
  }

  // === Calcular ===
  const calcs = [];
  for (const s of seeds) {
    if (s.id) {
      console.error(`[v3] calcular ${s.id}`);
      const c = await calcular(op, s.id, s.seq);
      await op.page.waitForTimeout(2000);
      await gotoAndShot(op, `/distribuicao/processos/${s.id}`, `v3_processo_calculado_${s.seq}`, 4000);
      calcs.push({ seq: s.seq, id: s.id, ...c, body_status: c.body?.status || null });
      s.calculado_status_http = c.status;
      s.body_status = c.body?.status || s.body_status;
    }
  }
  await op.context.close();

  // === Aprovar with gerente.dev ===
  console.error('[v3] login gerente.dev (aprovacao)');
  const gr = await loginAndCaptureToken(browser, gerenteCred);
  console.error(`[v3] gerente token=${jwtFp(gr.token)}`);
  let approval = null;
  let histVisible = 'nao-verificado';
  const targetCalc = calcs.find(c => c.status >= 200 && c.status < 300);
  const target = targetCalc ? seeds.find(s => s.id === targetCalc.id) : seeds.find(s => s.id);
  if (target && gr.token) {
    await gotoAndShot(gr, `/distribuicao/processos/${target.id}`, 'v3_gerente_processo_pre_aprovar', 4000);
    console.error(`[v3] aprovar ${target.id}`);
    approval = await aprovar(gr, target.id);
    await gr.page.waitForTimeout(2500);
    await gotoAndShot(gr, `/distribuicao/processos/${target.id}`, 'v3_processo_aprovado', 4000);
    approval.processoId = target.id;
    approval.screenshot = 'v3_processo_aprovado.png';
    // check historico tab
    histVisible = await detectHistoricoTab(gr, target.id);
    await gotoAndShot(gr, `/distribuicao/processos/${target.id}`, 'v3_processo_aprovado_historico_tab', 3000);
  }
  await gr.context.close();
  await browser.close();

  // === Persist ===
  const out = {
    captured_at: new Date().toISOString(),
    playwright_mode: 'headed',
    smoke: {
      gerente_processos_route: gerenteDenied ? 'ACESSO_NEGADO' : 'OK',
      gerente_screenshot: 'v3_smoke_gerente.png',
    },
    seeded_by: 'operador.dev@mcad.local',
    approved_by: 'gerente.dev@mcad.local',
    disponiveis_count: disp.items.length,
    seeds,
    calcs,
    approval,
    aba_historico_aparece_para_gerente: histVisible,
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'seed_processos_v3.json'), JSON.stringify(out, null, 2));
  console.error('[v3] DONE');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
