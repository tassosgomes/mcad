// Diagnose 404 on /api/distribuicao/v1/processos/disponiveis with operador token
import { chromium } from 'playwright';
import fs from 'fs';

const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';
const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';

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

async function main() {
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const operadorCred = creds.find((c) => c.hint === 'operador.dev');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let token = null;
  page.on('request', (req) => {
    if (req.url().startsWith(BFF_URL)) {
      const a = req.headers()['authorization'];
      if (a?.startsWith('Bearer ') && !token) token = a.slice(7);
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/logto\.app/, { timeout: 30000 });
  await page.locator('input[name="identifier"], input[type="email"]').first().fill(operadorCred.email);
  await page.locator('button[type="submit"], button:has-text("Continuar")').first().click();
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.locator('input[type="password"]').first().fill(operadorCred.senha);
  await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Continuar")').first().click();
  await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 45000 });

  const start = Date.now();
  while (!token && Date.now() - start < 15000) await page.waitForTimeout(250);

  if (!token) { console.log('NO TOKEN'); await browser.close(); return; }
  console.log('token fp:', '...' + token.slice(-10));

  const probes = [
    { name: 'disp_v1', url: `${BFF_URL}/api/distribuicao/v1/processos/disponiveis` },
    { name: 'list_v1', url: `${BFF_URL}/api/distribuicao/v1/processos?page=0&size=20` },
    { name: 'rubricas_v1', url: `${BFF_URL}/api/distribuicao/v1/rubricas` },
    { name: 'upstream_rubricas', url: `https://mcad-distribuicao.tasso.dev.br/api/v1/rubricas` },
    { name: 'actuator_mappings', url: `https://mcad-distribuicao.tasso.dev.br/actuator/mappings` },
    { name: 'actuator_info', url: `https://mcad-distribuicao.tasso.dev.br/actuator/info` },
    { name: 'actuator_env_routes', url: `https://mcad-distribuicao.tasso.dev.br/actuator/env` },
    { name: 'openapi', url: `https://mcad-distribuicao.tasso.dev.br/v3/api-docs` },
    { name: 'swagger_ui', url: `https://mcad-distribuicao.tasso.dev.br/swagger-ui/index.html` },
  ];

  for (const p of probes) {
    const t = Date.now();
    const r = await page.request.get(p.url, { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }).catch((e) => null);
    const dur = Date.now() - t;
    const st = r ? r.status() : 0;
    let body = null;
    try { body = await r?.text(); } catch {}
    console.log(`${p.name}\t${st}\t${dur}ms\tlen=${(body || '').length}`);
    console.log('  body:', (body || '').slice(0, 400));
  }

  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
