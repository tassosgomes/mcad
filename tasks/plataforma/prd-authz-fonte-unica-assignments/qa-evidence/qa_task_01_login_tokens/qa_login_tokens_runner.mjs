import { chromium } from '/home/tsgomes/mcad/frontend/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile, appendFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = '/home/tsgomes/mcad';
const BASE_URL = process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br';
const CREDENTIALS_FILE = path.join(REPO_ROOT, '.env_qa');
const EVIDENCE_DIR = path.join(
  REPO_ROOT,
  'tasks/plataforma/prd-authz-fonte-unica-assignments/qa-evidence/qa_task_01_login_tokens',
);
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const VIDEO_DIR = path.join(EVIDENCE_DIR, 'videos');
const ARTIFACT_DIR = path.join(EVIDENCE_DIR, 'artifacts');
const REQUEST_LOG = path.join(EVIDENCE_DIR, 'requests.log');
const REPORT_PATH = path.join(EVIDENCE_DIR, 'qa_report_task_01.md');
const EXPECTED_USERNAMES = new Set([
  'consultor_dev',
  'operador_dev',
  'gerente_dev',
  'analista_distribuicao',
  'gestor_acessosdev',
  'consultor_acessosdev',
  'admin_authz2',
  'sem_papel',
]);

function timestamp() {
  return new Date().toISOString();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function sanitize(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/(access_token|id_token|refresh_token|token|password|senha)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/("?(?:access_token|id_token|refresh_token|token|password|senha)"?\s*:\s*")([^"]+)(")/gi, '$1[REDACTED]$3')
    .replace(/([?&](?:code|state|session_state)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]');
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Access token is not a JWT with three segments');
  }

  const payloadSegment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payloadSegment.padEnd(payloadSegment.length + ((4 - (payloadSegment.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function scopeValues(payload) {
  const values = [];
  if (typeof payload.scope === 'string') {
    values.push(...payload.scope.split(/\s+/).filter(Boolean));
  }
  if (Array.isArray(payload.scp)) {
    values.push(...payload.scp.filter((item) => typeof item === 'string'));
  } else if (typeof payload.scp === 'string') {
    values.push(...payload.scp.split(/\s+/).filter(Boolean));
  }
  return values;
}

function summarizePayload(payload) {
  const scopes = scopeValues(payload);
  return {
    issuer: payload.iss ?? null,
    audience: payload.aud ?? null,
    subjectPresent: Boolean(payload.sub),
    email: payload.email ?? null,
    username: payload.username ?? payload.name ?? null,
    scope: scopes.join(' '),
    claimKeys: Object.keys(payload).sort(),
    hasRoleClaim: Object.prototype.hasOwnProperty.call(payload, 'role'),
    hasRolesClaim: Object.prototype.hasOwnProperty.call(payload, 'roles'),
    scopeHasRoles: scopes.includes('roles'),
  };
}

function assertTokenPayload(payload) {
  const summary = summarizePayload(payload);
  const failures = [];

  if (summary.hasRoleClaim) {
    failures.push('Payload contains top-level role claim');
  }
  if (summary.hasRolesClaim) {
    failures.push('Payload contains top-level roles claim');
  }
  if (summary.scopeHasRoles) {
    failures.push('scope/scp contains roles');
  }

  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }

  return summary;
}

async function parseCredentials() {
  const raw = await readFile(CREDENTIALS_FILE, 'utf8');
  const blocks = raw
    .split(/\n-{5,}\n?/)
    .map((block) => block.trim())
    .filter(Boolean);

  const credentials = blocks.map((block) => {
    const credential = {};
    for (const line of block.split(/\r?\n/)) {
      const [labelRaw, ...rest] = line.split(':');
      const label = labelRaw.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (!value) {
        continue;
      }
      if (label === 'hint') {
        credential.hint = value;
      } else if (label === 'endereco de e-mail' || label === 'endereço de e-mail') {
        credential.email = value;
      } else if (label === 'nome de usuario' || label === 'nome de usuário') {
        credential.username = value;
      } else if (label === 'senha' || label === 'nova senha') {
        credential.password = value;
      }
    }

    return credential;
  });

  const validCredentials = credentials.filter((credential) => credential.email && credential.username && credential.password);
  const missing = [...EXPECTED_USERNAMES].filter(
    (username) => !validCredentials.some((credential) => credential.username === username),
  );

  if (missing.length > 0) {
    throw new Error(`Missing expected credentials for usernames: ${missing.join(', ')}`);
  }

  const deduped = [];
  const seen = new Set();
  for (const credential of validCredentials) {
    if (!EXPECTED_USERNAMES.has(credential.username) || seen.has(credential.username)) {
      continue;
    }
    seen.add(credential.username);
    deduped.push(credential);
  }

  return deduped;
}

async function saveJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function appendLog(lines) {
  await appendFile(REQUEST_LOG, `${lines.map(sanitize).join('\n')}\n`, 'utf8');
}

async function waitForAccessToken(getToken) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const token = getToken();
    if (token) {
      return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Access token was not observed in OIDC token response or API Authorization header');
}

async function loginWithLogto(page, credential) {
  await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 20000 });

  const identifierInput = page.locator('input').first();
  await identifierInput.waitFor({ state: 'visible', timeout: 15000 });

  await page.evaluate(() => {
    document.querySelectorAll('form').forEach((form) => {
      form.noValidate = true;
    });
  });

  await identifierInput.fill(credential.username);

  const passwordInput = page.locator('input[type="password"]');
  if (!(await passwordInput.isVisible().catch(() => false))) {
    await page.locator('button[type="submit"]').first().click();
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  await passwordInput.fill(credential.password);
  await page.locator('button[type="submit"]').first().click();
}

async function runUser(browser, credential) {
  const slug = slugify(credential.username);
  const consoleMessages = [];
  const pageErrors = [];
  const requestEvents = [];
  let observedAccessToken = null;
  let tokenResponseSeen = false;
  let videoPath = null;

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 960 } },
  });
  const page = await context.newPage();

  page.on('console', (message) => {
    consoleMessages.push(`[${message.type()}] ${sanitize(message.text())}`);
  });
  page.on('pageerror', (error) => {
    pageErrors.push(sanitize(error.stack || error.message));
  });
  page.on('request', (request) => {
    const headers = request.headers();
    const authorization = headers.authorization || headers.Authorization;
    if (authorization?.startsWith('Bearer ') && !observedAccessToken) {
      observedAccessToken = authorization.slice('Bearer '.length);
    }
    const url = request.url();
    if (url.includes('/api/') || url.includes('/oidc/')) {
      requestEvents.push({
        direction: 'request',
        method: request.method(),
        url: sanitize(url),
        authorization: authorization ? 'Bearer [REDACTED]' : undefined,
      });
    }
  });
  page.on('requestfailed', (request) => {
    requestEvents.push({
      direction: 'requestfailed',
      method: request.method(),
      url: sanitize(request.url()),
      failure: sanitize(request.failure()?.errorText),
    });
  });
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('/oidc/')) {
      requestEvents.push({
        direction: 'response',
        method: response.request().method(),
        url: sanitize(url),
        status: response.status(),
      });
    }
    if (url.includes('/oidc/token')) {
      tokenResponseSeen = true;
      void response.json().then((body) => {
        if (body?.access_token && !observedAccessToken) {
          observedAccessToken = body.access_token;
        }
      }).catch((error) => {
        pageErrors.push(`Failed to inspect token response body: ${sanitize(error.message)}`);
      });
    }
  });

  const result = {
    username: credential.username,
    email: credential.email,
    status: 'FAIL',
    startedAt: timestamp(),
    finishedAt: null,
    finalUrl: null,
    tokenSummary: null,
    checks: {
      redirectedToLogto: false,
      loginReturnedToApp: false,
      authenticatedPageReached: false,
      accessTokenObserved: false,
      tokenIsJwt: false,
      noRoleClaim: false,
      noRolesClaim: false,
      scopeHasNoRoles: false,
    },
    error: null,
    screenshots: [],
    video: null,
    consoleMessages,
    pageErrors,
    requestEvents,
  };

  try {
    await appendLog([
      '========================================',
      `User: ${credential.email} / ${credential.username}`,
      `Timestamp: ${timestamp()}`,
      'Credentials: [REDACTED]',
      '========================================',
      '--- REQUEST ---',
      `Method: GET`,
      `URL: ${BASE_URL}/`,
      'Headers: browser default',
    ]);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 20000 });
    result.checks.redirectedToLogto = true;

    const loginScreenshot = path.join(SCREENSHOT_DIR, `${slug}_01_logto_login.png`);
    await page.screenshot({ path: loginScreenshot, fullPage: true });
    result.screenshots.push(path.relative(EVIDENCE_DIR, loginScreenshot));

    await loginWithLogto(page, credential);

    await page.waitForURL((url) => url.origin === BASE_URL && !url.pathname.startsWith('/callback'), {
      timeout: 60000,
    });
    result.checks.loginReturnedToApp = true;

    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    result.finalUrl = sanitize(page.url());
    result.checks.authenticatedPageReached = true;

    const token = await waitForAccessToken(() => observedAccessToken);
    result.checks.accessTokenObserved = Boolean(token);
    const payload = decodeJwtPayload(token);
    result.checks.tokenIsJwt = true;
    const summary = summarizePayload(payload);
    result.tokenSummary = summary;
    result.checks.noRoleClaim = !summary.hasRoleClaim;
    result.checks.noRolesClaim = !summary.hasRolesClaim;
    result.checks.scopeHasNoRoles = !summary.scopeHasRoles;
    assertTokenPayload(payload);

    const finalScreenshot = path.join(SCREENSHOT_DIR, `${slug}_02_authenticated.png`);
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    result.screenshots.push(path.relative(EVIDENCE_DIR, finalScreenshot));

    result.status = 'PASS';
  } catch (error) {
    result.error = sanitize(error.stack || error.message);
    result.finalUrl = sanitize(page.url());
    const failScreenshot = path.join(SCREENSHOT_DIR, `${slug}_fail.png`);
    await page.screenshot({ path: failScreenshot, fullPage: true }).catch(() => undefined);
    result.screenshots.push(path.relative(EVIDENCE_DIR, failScreenshot));
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      try {
        const rawVideoPath = await video.path();
        videoPath = path.join(VIDEO_DIR, `${slug}.webm`);
        await rm(videoPath, { force: true });
        await writeFile(videoPath, await readFile(rawVideoPath));
        result.video = path.relative(EVIDENCE_DIR, videoPath);
      } catch (error) {
        pageErrors.push(`Failed to save video artifact: ${sanitize(error.message)}`);
      }
    }
    result.finishedAt = timestamp();
    result.tokenResponseSeen = tokenResponseSeen;

    await appendLog([
      '--- RESPONSE / OBSERVATIONS ---',
      `Final URL: ${result.finalUrl ?? '[not reached]'}`,
      `OIDC token response seen: ${tokenResponseSeen}`,
      `Access token observed: ${result.checks.accessTokenObserved}`,
      `Token payload claim keys: ${result.tokenSummary?.claimKeys?.join(', ') ?? '[not decoded]'}`,
      `Token scope: ${result.tokenSummary?.scope ?? '[not decoded]'}`,
      `role claim present: ${result.tokenSummary?.hasRoleClaim ?? '[not decoded]'}`,
      `roles claim present: ${result.tokenSummary?.hasRolesClaim ?? '[not decoded]'}`,
      `scope contains roles: ${result.tokenSummary?.scopeHasRoles ?? '[not decoded]'}`,
      `Result: ${result.status}`,
      result.error ? `Error: ${result.error}` : 'Error: none',
      '',
    ]);

    await saveJson(path.join(ARTIFACT_DIR, `${slug}.json`), result);
  }

  return result;
}

function statusIcon(status) {
  return status === 'PASS' ? 'PASS' : 'FAIL';
}

function renderReport(results) {
  const allPassed = results.every((result) => result.status === 'PASS');
  const rows = results.map((result) => (
    `| ${result.email} | ${result.username} | ${statusIcon(result.status)} | ${result.finalUrl ?? '-'} |`
  )).join('\n');
  const detailSections = results.map((result) => {
    const screenshots = result.screenshots.map((item) => `- Screenshot: \`${item}\``).join('\n') || '- Screenshot: nao disponivel';
    const consoleBlock = result.consoleMessages.length > 0
      ? result.consoleMessages.join('\n')
      : 'Nenhuma mensagem de console capturada.';
    const pageErrorBlock = result.pageErrors.length > 0
      ? result.pageErrors.join('\n')
      : 'Nenhum pageerror capturado.';
    const checks = Object.entries(result.checks)
      .map(([key, value]) => `- ${key}: ${value ? 'PASS' : 'FAIL'}`)
      .join('\n');
    const tokenSummary = result.tokenSummary
      ? [
          `- issuer: ${result.tokenSummary.issuer}`,
          `- audience: ${Array.isArray(result.tokenSummary.audience) ? result.tokenSummary.audience.join(', ') : result.tokenSummary.audience}`,
          `- subjectPresent: ${result.tokenSummary.subjectPresent}`,
          `- scope: ${result.tokenSummary.scope}`,
          `- role claim present: ${result.tokenSummary.hasRoleClaim}`,
          `- roles claim present: ${result.tokenSummary.hasRolesClaim}`,
          `- scope contains roles: ${result.tokenSummary.scopeHasRoles}`,
          `- claim keys: ${result.tokenSummary.claimKeys.join(', ')}`,
        ].join('\n')
      : 'Token nao decodificado.';

    return `### ${result.email} / ${result.username} - ${statusIcon(result.status)}

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** ${result.status === 'PASS' ? 'Comportamento esperado observado.' : `Falha observada: ${result.error ?? 'erro nao especificado'}`}
**Final URL:** ${result.finalUrl ?? '-'}

**Checks:**
${checks}

**Token summary sanitizado:**
${tokenSummary}

**Console do browser:**
\`\`\`
${consoleBlock}
\`\`\`

**Page errors:**
\`\`\`
${pageErrorBlock}
\`\`\`

**Evidencias:**
${screenshots}
- Video: \`${result.video ?? 'nao disponivel'}\`
- Artifact JSON: \`artifacts/${slugify(result.username)}.json\`
`;
  }).join('\n');

  return `# QA Report - Login OIDC e tokens sem roles

**Task ID:** qa_task_01_login_tokens_env_qa
**Data/Hora:** ${timestamp()}
**Status Geral:** ${allPassed ? 'PASS' : 'FAIL'}

## Contexto

- **User Story:** Validate .env_qa users can authenticate and receive tokens without business roles.
- **Ambiente:** ${BASE_URL}
- **Tipos de teste:** UI / OIDC
- **Autenticacao:** Sim, Logto OIDC via browser
- **Banco:** Nao executado; qa_session.json indica database.enabled=false.
- **Sanitizacao:** Senhas, tokens, headers Authorization e codigos OAuth omitidos como [REDACTED].

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Login OIDC pela UI para cada usuario .env_qa | UI | ${allPassed ? 'PASS' : 'FAIL'} |
| CT-02 | Access token sem claims role/roles e sem escopo roles | UI/OIDC | ${allPassed ? 'PASS' : 'FAIL'} |
| CT-03 | Evidencias sanitizadas por usuario | Relatorio | PASS |

## Usuarios Testados

| Email | Username | Status | Final URL |
|-------|----------|--------|-----------|
${rows}

## Detalhes por Usuario

${detailSections}

## Resumo de Evidencias

- Plano: \`test_plan.md\`
- Request/response sanitizado: \`requests.log\`
- Screenshots: \`screenshots/\`
- Videos: \`videos/\`
- Artifacts sanitizados: \`artifacts/\`

## Informacoes para o Orquestrador

**Status final:** ${allPassed ? 'PASS' : 'FAIL'}
**Motivo:** ${allPassed ? 'Todos os usuarios autenticaram e os tokens avaliados nao contem role/roles nem escopo roles.' : 'Uma ou mais validacoes de usuario falharam; ver detalhes por usuario.'}
`;
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });
  await mkdir(ARTIFACT_DIR, { recursive: true });
  for (const fileName of await readdir(VIDEO_DIR).catch(() => [])) {
    if (fileName.startsWith('page@') && fileName.endsWith('.webm')) {
      await rm(path.join(VIDEO_DIR, fileName), { force: true });
    }
  }
  await writeFile(REQUEST_LOG, `QA task 01 sanitized request log\nStarted: ${timestamp()}\nBase URL: ${BASE_URL}\n\n`, 'utf8');

  const credentials = await parseCredentials();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const credential of credentials) {
      const result = await runUser(browser, credential);
      results.push(result);
      console.log(`${result.status} ${credential.email} / ${credential.username}`);
    }
  } finally {
    await browser.close();
  }

  await writeFile(REPORT_PATH, renderReport(results), 'utf8');

  if (results.some((result) => result.status !== 'PASS')) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const message = sanitize(error.stack || error.message);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await appendFile(REQUEST_LOG, `Fatal error: ${message}\n`, 'utf8').catch(() => undefined);
  await writeFile(
    REPORT_PATH,
    `# QA Report - Login OIDC e tokens sem roles\n\n**Task ID:** qa_task_01_login_tokens_env_qa\n**Data/Hora:** ${timestamp()}\n**Status Geral:** FAIL\n\nFatal error before per-user execution:\n\n\`\`\`\n${message}\n\`\`\`\n`,
    'utf8',
  ).catch(() => undefined);
  console.error(message);
  process.exitCode = 1;
});
