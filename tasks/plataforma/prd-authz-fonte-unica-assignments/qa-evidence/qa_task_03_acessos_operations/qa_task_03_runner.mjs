import { chromium } from '/home/tsgomes/mcad/frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-authz-fonte-unica-assignments/qa-evidence/qa_task_03_acessos_operations';
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const VIDEOS_DIR = path.join(EVIDENCE_DIR, 'videos');
const REQUEST_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const RESULT_JSON = path.join(EVIDENCE_DIR, 'results.json');
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';

const BASE_URL = process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br';
const BFF_URL = process.env.QA_BFF_URL || 'https://mcad-bff.tasso.dev.br';

const TARGETS = [
  {
    ct: 'CT-01',
    hint: 'gestor-acessos.dev',
    routeExpected: 'accessible',
    endpointExpectedStatus: 200,
    endpoints: [
      '/api/acessos/usuarios?query=acessos&page=0&size=10',
      '/api/acessos/papeis?page=0&size=20',
      '/api/acessos/assignments?page=0&size=20',
      '/api/acessos/atribuicoes/historico?page=0&size=10',
    ],
  },
  {
    ct: 'CT-02',
    hint: 'consultor-acessos.dev',
    routeExpected: 'accessible',
    endpointExpectedStatus: 200,
    endpoints: [
      '/api/acessos/usuarios?query=acessos&page=0&size=10',
      '/api/acessos/papeis?page=0&size=20',
      '/api/acessos/assignments?page=0&size=20',
      '/api/acessos/atribuicoes/historico?page=0&size=10',
    ],
  },
  {
    ct: 'CT-03',
    hint: 'sem-papel.dev',
    routeExpected: 'denied',
    endpointExpectedStatus: 403,
    endpoints: [
      '/api/acessos/usuarios?query=acessos&page=0&size=10',
      '/api/acessos/papeis?page=0&size=20',
      '/api/acessos/assignments?page=0&size=20',
      '/api/acessos/atribuicoes/historico?page=0&size=10',
    ],
  },
];

function ensureDirs() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  fs.writeFileSync(REQUEST_LOG, `QA task 03 requests.log\nStarted: ${new Date().toISOString()}\nAuthorization: Bearer [TOKEN REDACTED]\n\n`);
}

function parseCreds(text) {
  const records = text.split(/-{5,}\n?/g);
  const out = new Map();
  for (const rec of records) {
    const hint = (rec.match(/Hint:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const email = (rec.match(/Endere[cç]o de e-mail:\s*([^\r\n]+)/i) || rec.match(/E-?mail:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const username = (rec.match(/Nome de usu[aá]rio:\s*([^\r\n]+)/i) || [])[1]?.trim();
    const password = (rec.match(/(?:Nova\s+)?Senha:\s*([^\r\n]+)/i) || [])[1]?.trim();
    if (hint && email && password) {
      out.set(hint, { hint, email, username, password });
    }
  }
  return out;
}

function redactHeaders(headers) {
  const safe = { ...headers };
  for (const key of Object.keys(safe)) {
    if (key.toLowerCase() === 'authorization') {
      safe[key] = 'Bearer [TOKEN REDACTED]';
    }
  }
  return safe;
}

function sanitizeBody(body) {
  if (typeof body === 'string') {
    return body.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [TOKEN REDACTED]');
  }
  return body;
}

function appendRequestLog(entry) {
  fs.appendFileSync(REQUEST_LOG, [
    '========================================',
    `${entry.ct}: ${entry.description}`,
    `Timestamp: ${entry.timestamp}`,
    '--- REQUEST ---',
    `Method: ${entry.method}`,
    `URL: ${entry.url}`,
    'Headers:',
    JSON.stringify(redactHeaders(entry.requestHeaders), null, 2),
    'Body:',
    entry.requestBody ?? '(empty)',
    '--- RESPONSE ---',
    `Status: ${entry.status}`,
    `DurationMs: ${entry.durationMs}`,
    'Headers:',
    JSON.stringify(entry.responseHeaders, null, 2),
    'Body:',
    typeof entry.responseBody === 'string' ? entry.responseBody : JSON.stringify(sanitizeBody(entry.responseBody), null, 2),
    `--- RESULTADO: ${entry.pass ? 'PASS' : 'FAIL'} ---`,
    `Expected status: ${entry.expectedStatus}`,
    `Actual status:   ${entry.status}`,
    '',
  ].join('\n'));
}

async function fillLogin(page, cred) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForURL(/logto\.app/, { timeout: 30000 }).catch(() => {});

  if (!page.url().includes('logto.app')) {
    throw new Error(`Did not redirect to Logto; current URL=${page.url()}`);
  }

  const emailInput = page.locator('input[name="identifier"], input[type="email"], input[name="email"], input[autocomplete="username"]').first();
  await emailInput.waitFor({ timeout: 15000 });
  await emailInput.fill(cred.email);
  const firstSubmit = page.locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Continue"), button:has-text("Proximo"), button:has-text("Próximo"), button:has-text("Next")').first();
  if (await firstSubmit.count()) await firstSubmit.click();
  else await page.keyboard.press('Enter');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 15000 });
  await passwordInput.fill(cred.password);
  const secondSubmit = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Continuar"), button:has-text("Login"), button:has-text("Sign in")').first();
  if (await secondSubmit.count()) await secondSubmit.click();
  else await page.keyboard.press('Enter');

  await page.waitForURL(/mcad\.tasso\.dev\.br/, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
}

async function captureBearerToken(page) {
  const started = Date.now();
  let token = null;
  const listener = (request) => {
    const auth = request.headers()['authorization'];
    if (!token && auth?.startsWith('Bearer ')) {
      token = auth.slice('Bearer '.length);
    }
  };
  page.on('request', listener);
  await page.goto(`${BASE_URL}/autorizacao/atribuicoes`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  while (!token && Date.now() - started < 30000) {
    await page.waitForTimeout(250);
  }
  page.off('request', listener);
  if (!token) {
    throw new Error('No Bearer token captured from authenticated browser session');
  }
  return token;
}

async function requestJson(page, token, target, endpoint) {
  const url = `${BFF_URL}${endpoint}`;
  const started = Date.now();
  const response = await page.request.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'x-qa-task': 'qa_task_03_acessos_operations',
    },
    timeout: 30000,
  });
  const durationMs = Date.now() - started;
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = sanitizeBody(text);
  }
  const status = response.status();
  const pass = status === target.endpointExpectedStatus;
  appendRequestLog({
    ct: target.ct,
    description: `${target.hint} GET ${endpoint}`,
    timestamp: new Date().toISOString(),
    method: 'GET',
    url,
    requestHeaders: {
      Authorization: 'Bearer [TOKEN REDACTED]',
      Accept: 'application/json',
      'x-qa-task': 'qa_task_03_acessos_operations',
    },
    requestBody: '(empty)',
    status,
    durationMs,
    responseHeaders: response.headers(),
    responseBody: body,
    expectedStatus: target.endpointExpectedStatus,
    pass,
  });
  return { endpoint, status, expectedStatus: target.endpointExpectedStatus, pass, body };
}

async function evaluateRoute(page, target) {
  await page.goto(`${BASE_URL}/autorizacao/atribuicoes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  const screenshot = path.join(SCREENSHOTS_DIR, `${target.ct.toLowerCase()}_${target.hint.replace(/[^a-z0-9]+/gi, '_')}_ui.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const denied = /permiss[aã]o negada|acesso negado|sem permiss[aã]o|403|not authorized|unauthorized/i.test(text);
  const accessible = /atribui[cç][oõ]es|buscar atribui[cç][oõ]es|atribuir acessos/i.test(text) && !denied;
  const pass = target.routeExpected === 'denied' ? denied || !accessible : accessible;
  return { screenshot, textPreview: text.slice(0, 500), denied, accessible, expected: target.routeExpected, pass, url: page.url() };
}

async function runTarget(browser, target, cred) {
  const consoleMessages = [];
  const pageErrors = [];
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: VIDEOS_DIR, size: { width: 1366, height: 768 } },
  });
  const page = await context.newPage();
  page.on('console', (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const result = {
    ct: target.ct,
    hint: target.hint,
    status: 'UNKNOWN',
    route: null,
    endpoints: [],
    consoleMessages,
    pageErrors,
    failure: null,
    video: null,
  };

  try {
    await fillLogin(page, cred);
    const token = await captureBearerToken(page);
    result.route = await evaluateRoute(page, target);
    if (!result.route.pass) {
      throw new Error(`${target.ct} UI route expectation failed: expected ${target.routeExpected}, accessible=${result.route.accessible}, denied=${result.route.denied}`);
    }

    for (const endpoint of target.endpoints) {
      const endpointResult = await requestJson(page, token, target, endpoint);
      result.endpoints.push({
        endpoint,
        status: endpointResult.status,
        expectedStatus: endpointResult.expectedStatus,
        pass: endpointResult.pass,
      });
      if (!endpointResult.pass) {
        throw new Error(`${target.ct} ${endpoint} expected ${endpointResult.expectedStatus}, got ${endpointResult.status}`);
      }
    }

    result.status = 'PASS';
  } catch (err) {
    result.status = 'FAIL';
    result.failure = err instanceof Error ? err.stack || err.message : String(err);
    const failShot = path.join(SCREENSHOTS_DIR, `${target.ct.toLowerCase()}_${target.hint.replace(/[^a-z0-9]+/gi, '_')}_fail.png`);
    await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
    result.failureScreenshot = failShot;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    const videos = fs.readdirSync(VIDEOS_DIR)
      .filter((file) => file.endsWith('.webm'))
      .map((file) => path.join(VIDEOS_DIR, file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    result.video = videos[0] ?? null;
  }

  return result;
}

async function main() {
  ensureDirs();
  const creds = parseCreds(fs.readFileSync(CREDS_FILE, 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const target of TARGETS) {
      const cred = creds.get(target.hint);
      if (!cred) {
        throw new Error(`Credential block not found for ${target.hint}`);
      }
      const result = await runTarget(browser, target, cred);
      results.push(result);
      fs.writeFileSync(RESULT_JSON, JSON.stringify({ baseUrl: BASE_URL, bffUrl: BFF_URL, results }, null, 2));
      if (result.status !== 'PASS') {
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    await browser.close().catch(() => {});
    fs.writeFileSync(RESULT_JSON, JSON.stringify({ baseUrl: BASE_URL, bffUrl: BFF_URL, results }, null, 2));
  }

  if (results.some((result) => result.status !== 'PASS') || results.length !== TARGETS.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  fs.writeFileSync(RESULT_JSON, JSON.stringify({ baseUrl: BASE_URL, bffUrl: BFF_URL, fatal: err instanceof Error ? err.stack || err.message : String(err) }, null, 2));
  process.exitCode = 1;
});
