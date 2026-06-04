import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const frontendRequire = createRequire(new URL('../../../../../frontend/package.json', import.meta.url));
const { test, expect } = frontendRequire('@playwright/test');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');
const evidenceDir = __dirname;
const screenshotsDir = path.join(evidenceDir, 'screenshots');
const requestsLogPath = path.join(evidenceDir, 'requests.log');
const resultsPath = path.join(evidenceDir, 'execution-results.json');
const reportPath = path.join(evidenceDir, 'qa_report_task_02.md');
const credentialsPath = path.join(repoRoot, '.env_qa');
const baseUrl = process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br';

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(path.join(evidenceDir, 'videos'), { recursive: true });

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const values = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  return values;
}

function normalizeProfileKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function loadProfiles() {
  const rawCredentials = fs.readFileSync(credentialsPath, 'utf8');
  const env = parseEnvFile(credentialsPath);
  const sharedPassword = env.get('QA_SHARED_PASSWORD') || env.get('QA_PASSWORD') || '';
  const profiles = [];

  for (const [key, username] of env.entries()) {
    const match = key.match(/^QA_(.+)_USERNAME$/);
    if (!match) {
      continue;
    }

    const rawKey = match[1];
    const password = env.get(`QA_${rawKey}_PASSWORD`) || sharedPassword;
    profiles.push({
      envKey: rawKey,
      slug: normalizeProfileKey(rawKey),
      username,
      email: env.get(`QA_${rawKey}_EMAIL`) || null,
      password,
    });
  }

  if (profiles.length === 0) {
    const blocks = rawCredentials
      .split(/\n-{5,}\n?/)
      .map((block) => block.trim())
      .filter(Boolean);

    for (const block of blocks) {
      const profile = {};
      for (const line of block.split(/\r?\n/)) {
        const [labelRaw, ...rest] = line.split(':');
        const label = labelRaw.trim().toLowerCase();
        const value = rest.join(':').trim();
        if (!value) {
          continue;
        }

        if (label === 'hint') {
          profile.hint = value;
        } else if (label === 'endereco de e-mail' || label === 'endereço de e-mail') {
          profile.email = value;
        } else if (label === 'nome de usuario' || label === 'nome de usuário') {
          profile.username = value;
        } else if (label === 'senha' || label === 'nova senha') {
          profile.password = value;
        }
      }

      if (profile.username && profile.password) {
        profiles.push({
          envKey: normalizeProfileKey(profile.hint || profile.username).toUpperCase(),
          slug: normalizeProfileKey(profile.hint || profile.username),
          username: profile.username,
          email: profile.email || null,
          password: profile.password,
        });
      }
    }
  }

  const uniqueProfiles = [];
  const seen = new Set();
  for (const profile of profiles) {
    if (seen.has(profile.username)) {
      continue;
    }
    seen.add(profile.username);
    uniqueProfiles.push(profile);
  }

  uniqueProfiles.sort((a, b) => {
    const semPapelA = isNoRoleProfile(a) ? 1 : 0;
    const semPapelB = isNoRoleProfile(b) ? 1 : 0;
    return semPapelA - semPapelB || a.slug.localeCompare(b.slug);
  });

  return uniqueProfiles.map((profile, index) => ({
    ...profile,
    id: `CT-${String(index + 1).padStart(2, '0')}`,
  }));
}

function isNoRoleProfile(profile) {
  return /(^|_)(sem_papel|sem_role|no_role|norole|without_role)($|_)/i.test(`${profile.slug}_${profile.username}`);
}

const profiles = loadProfiles();
const secretValues = profiles.map((profile) => profile.password).filter(Boolean);

function redactSensitiveText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  let text = String(value);
  for (const secret of secretValues) {
    if (secret) {
      text = text.split(secret).join('[PASSWORD_MASKED]');
    }
  }

  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [TOKEN_MASKED]')
    .replace(/(access_token|id_token|refresh_token|token|code|state|session_state|client_secret|password)=([^&\s]+)/gi, '$1=[MASKED]')
    .replace(/"?(access_token|id_token|refresh_token|token|code|state|session_state|client_secret|password)"?\s*:\s*"[^"]*"/gi, '"$1":"[MASKED]"');
}

function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/(access_token|id_token|refresh_token|token|code|state|session_state|client_secret|password)/i.test(key)) {
        parsed.searchParams.set(key, '[MASKED]');
      }
    }
    return parsed.toString();
  } catch {
    return redactSensitiveText(rawUrl);
  }
}

function sanitizeHeaders(headers) {
  const result = {};
  for (const [name, value] of Object.entries(headers || {})) {
    const lowerName = name.toLowerCase();
    if (lowerName === 'authorization') {
      result[name] = /^Bearer\s+\S+/i.test(String(value)) ? 'Bearer [PRESENT_MASKED]' : '[MASKED]';
      continue;
    }
    if (lowerName === 'cookie' || lowerName === 'set-cookie' || lowerName.includes('token') || lowerName.includes('secret')) {
      result[name] = '[MASKED]';
      continue;
    }
    result[name] = redactSensitiveText(value);
  }
  return result;
}

function appendRequestLog(lines) {
  fs.appendFileSync(requestsLogPath, `${lines.join('\n')}\n`);
}

function readResults() {
  return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

function writeResults(results) {
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
}

function recordResult(entry) {
  const current = readResults();
  current.cases.push(entry);
  current.updatedAt = new Date().toISOString();
  writeResults(current);
}

function isRelevantUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const appOrigin = new URL(baseUrl).origin;
    return parsed.origin === appOrigin || parsed.hostname.includes('logto.app') || parsed.pathname.includes('/api/me');
  } catch {
    return false;
  }
}

async function saveScreenshot(page, filename) {
  const target = path.join(screenshotsDir, filename);
  try {
    await page.screenshot({ path: target, fullPage: true });
    return path.relative(evidenceDir, target);
  } catch (error) {
    appendRequestLog([
      '--- SCREENSHOT ERROR ---',
      `Path: ${path.relative(evidenceDir, target)}`,
      `Error: ${redactSensitiveText(error?.message || error)}`,
      '',
    ]);
    return null;
  }
}

function summarizeMe(status, body, headers) {
  const value = body && typeof body === 'object' ? body : {};
  const nestedUser = value.user && typeof value.user === 'object' ? value.user : {};
  const subjectId = value.subjectId ?? value.subject ?? value.sub ?? value.id ?? nestedUser.subject ?? nestedUser.subjectId ?? nestedUser.sub ?? null;
  const email = value.email ?? nestedUser.email ?? null;
  const roles = Array.isArray(value.roles) ? value.roles : Array.isArray(nestedUser.roles) ? nestedUser.roles : null;
  return {
    status,
    subjectId: typeof subjectId === 'string' ? subjectId : null,
    email: typeof email === 'string' ? email : null,
    primaryRole: typeof value.primaryRole === 'string' || value.primaryRole === null ? value.primaryRole : null,
    rolesCount: Array.isArray(roles) ? roles.length : null,
    authzVersionHeader: headers['x-authz-version'] || null,
  };
}

function summarizePermissions(status, body, headers) {
  const value = body && typeof body === 'object' ? body : {};
  return {
    status,
    subjectId: typeof value.subjectId === 'string' ? value.subjectId : null,
    permissionCount: Array.isArray(value.permissions) ? value.permissions.length : null,
    authzVersion: typeof value.version === 'number' || typeof value.version === 'string' ? value.version : null,
    authzVersionHeader: headers['x-authz-version'] || null,
  };
}

async function callApi(profile, bearerToken, bffOrigin, apiPath) {
  const url = new URL(apiPath, bffOrigin).toString();

  appendRequestLog([
    '========================================',
    `${profile.id} ${profile.username} API REQUEST`,
    `Timestamp: ${new Date().toISOString()}`,
    'Method: GET',
    `URL: ${sanitizeUrl(url)}`,
    'Headers:',
    JSON.stringify({ Accept: 'application/json', Authorization: 'Bearer [TOKEN OMITIDO]' }, null, 2),
    '',
  ]);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: redactSensitiveText(text).slice(0, 1000) };
  }

  const headers = Object.fromEntries(response.headers.entries());
  const summary = apiPath.endsWith('/permissions')
    ? summarizePermissions(response.status, body, headers)
    : summarizeMe(response.status, body, headers);

  appendRequestLog([
    `--- RESPONSE ${profile.id} ${profile.username} ${apiPath} ---`,
    `Timestamp: ${new Date().toISOString()}`,
    `Status: ${response.status}`,
    'Headers:',
    JSON.stringify(sanitizeHeaders(headers), null, 2),
    'Sanitized summary:',
    JSON.stringify(summary, null, 2),
    '',
  ]);

  return { status: response.status, headers, body, summary };
}

function attachObservers(page, profile, state) {
  page.on('console', (message) => {
    state.consoleMessages.push(redactSensitiveText(`[${message.type()}] ${message.text()}`));
  });

  page.on('pageerror', (error) => {
    state.pageErrors.push(redactSensitiveText(error?.message || error));
  });

  page.on('request', (request) => {
    const requestUrl = request.url();
    if (!isRelevantUrl(requestUrl)) {
      return;
    }

    const headers = request.headers();
    const authorization = headers.authorization || headers.Authorization;
    const bearerMatch = String(authorization || '').match(/^Bearer\s+(.+)$/i);
    try {
      const parsedUrl = new URL(requestUrl);
      if (parsedUrl.pathname.startsWith('/api/me')) {
        state.bffOrigin = parsedUrl.origin;
      }
    } catch {
      // Ignore malformed URLs from browser internals.
    }

    if (bearerMatch && !state.bearerToken) {
      state.bearerToken = bearerMatch[1];
      state.bearerSeen = true;
      state.resolveBearer?.(bearerMatch[1]);
    }

    appendRequestLog([
      '========================================',
      `${profile.id} ${profile.username} BROWSER REQUEST`,
      `Timestamp: ${new Date().toISOString()}`,
      `Method: ${request.method()}`,
      `URL: ${sanitizeUrl(requestUrl)}`,
      'Headers:',
      JSON.stringify(sanitizeHeaders(headers), null, 2),
      'Body: [not captured by UI network logger]',
      '',
    ]);
  });

  page.on('requestfailed', (request) => {
    appendRequestLog([
      '--- BROWSER REQUEST FAILED ---',
      `${profile.id} ${profile.username}`,
      `Method: ${request.method()}`,
      `URL: ${sanitizeUrl(request.url())}`,
      `Failure: ${redactSensitiveText(request.failure()?.errorText || 'unknown')}`,
      '',
    ]);
  });

  page.on('response', async (response) => {
    const responseUrl = response.url();
    if (!isRelevantUrl(responseUrl)) {
      return;
    }

    appendRequestLog([
      `--- BROWSER RESPONSE ${profile.id} ${profile.username} ---`,
      `Timestamp: ${new Date().toISOString()}`,
      `Status: ${response.status()}`,
      `URL: ${sanitizeUrl(responseUrl)}`,
      'Headers:',
      JSON.stringify(sanitizeHeaders(response.headers()), null, 2),
      'Body: [not captured for browser/OIDC flow]',
      '',
    ]);
  });
}

async function loginWithLogto(page, profile) {
  await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });
  await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.slug}_idp_start.png`);

  const identifierInput = page.locator('input').first();
  await identifierInput.waitFor({ state: 'visible', timeout: 20_000 });

  await page.evaluate(() => {
    document.querySelectorAll('form').forEach((form) => {
      form.noValidate = true;
    });
  });

  await identifierInput.fill(profile.username);

  const passwordInput = page.locator('input[type="password"]');
  const passwordVisible = await passwordInput.isVisible().catch(() => false);
  if (!passwordVisible) {
    await page.locator('button[type="submit"]').first().click();
    await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });
  }

  await passwordInput.fill(profile.password);

  await Promise.all([
    page.waitForURL((url) => {
      const appOrigin = new URL(baseUrl).origin;
      return url.origin === appOrigin && url.pathname !== '/callback';
    }, { timeout: 70_000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

function assertExpected(profile, meResponse, permissionsResponse) {
  expect(meResponse.status, '/api/me deve retornar HTTP 2xx').toBeGreaterThanOrEqual(200);
  expect(meResponse.status, '/api/me deve retornar HTTP 2xx').toBeLessThan(300);

  const noRole = isNoRoleProfile(profile);
  if (permissionsResponse.status >= 200 && permissionsResponse.status < 300) {
    expect(permissionsResponse.summary.subjectId, '/api/me/permissions deve retornar subjectId').toBeTruthy();
    expect(permissionsResponse.summary.permissionCount, '/api/me/permissions deve retornar permissions[]').not.toBeNull();
    expect(permissionsResponse.summary.authzVersion, '/api/me/permissions deve retornar version').not.toBeNull();

    if (noRole) {
      expect(permissionsResponse.summary.permissionCount, 'sem_papel nao deve ter permissoes efetivas').toBe(0);
    } else {
      expect(permissionsResponse.summary.permissionCount, `${profile.username} deve ter ao menos uma permissao efetiva`).toBeGreaterThan(0);
    }
    return 'PASS';
  }

  if (noRole && [401, 403].includes(permissionsResponse.status)) {
    return 'PASS_DENY_SAFE';
  }

  throw new Error(`/api/me/permissions retornou HTTP ${permissionsResponse.status}`);
}

function buildReport() {
  const results = readResults();
  const failed = results.cases.find((entry) => entry.status === 'FAIL');
  const notRun = profiles.filter((profile) => !results.cases.some((entry) => entry.username === profile.username));
  const finalStatus = failed ? 'FAIL' : notRun.length > 0 ? 'BLOCKED' : 'PASS';
  const now = new Date().toISOString();

  const rows = results.cases.map((entry) => {
    const statusIcon = entry.status === 'PASS' || entry.status === 'PASS_DENY_SAFE' ? 'PASS' : 'FAIL';
    return `| ${entry.id} | ${entry.username} | ${entry.me?.status ?? '-'} | ${entry.permissions?.status ?? '-'} | ${entry.permissions?.permissionCount ?? '-'} | ${entry.permissions?.authzVersion ?? entry.permissions?.authzVersionHeader ?? '-'} | ${entry.me?.primaryRole ?? '-'} | ${statusIcon} |`;
  });

  for (const profile of notRun) {
    rows.push(`| ${profile.id} | ${profile.username} | - | - | - | - | - | NAO EXECUTADO |`);
  }

  const details = results.cases.map((entry) => {
    const evidence = (entry.screenshots || []).map((item) => `- Screenshot: \`${item}\``).join('\n') || '- Screenshot: nao capturado';
    const consoleMessages = (entry.consoleMessages || []).length
      ? `\n\n**Console do browser:**\n\n\`\`\`\n${entry.consoleMessages.join('\n').slice(0, 4000)}\n\`\`\``
      : '';
    const pageErrors = (entry.pageErrors || []).length
      ? `\n\n**Page errors:**\n\n\`\`\`\n${entry.pageErrors.join('\n').slice(0, 4000)}\n\`\`\``
      : '';
    const error = entry.error
      ? `\n\n**Erro capturado:**\n\n\`\`\`\n${entry.error.slice(0, 4000)}\n\`\`\``
      : '';

    return `### ${entry.id} — ${entry.username} ${entry.status}\n\n**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.\n\n**Actual:** /api/me HTTP ${entry.me?.status ?? '-'}; /api/me/permissions HTTP ${entry.permissions?.status ?? '-'}; permissionCount ${entry.permissions?.permissionCount ?? '-'}; authzVersion ${entry.permissions?.authzVersion ?? entry.permissions?.authzVersionHeader ?? '-'}; primaryRole ${entry.me?.primaryRole ?? '-'}.\n\n**Evidencias:**\n- Request/Response: \`requests.log\`\n${evidence}${consoleMessages}${pageErrors}${error}`;
  });

  const failures = failed
    ? `**Motivo:** ${failed.id} ${failed.username} falhou — ${failed.error || 'falha registrada nos detalhes.'}`
    : notRun.length > 0
      ? `**Motivo:** execucao interrompida antes de todos os perfis: ${notRun.map((profile) => profile.username).join(', ')}.`
      : '**Motivo:** todos os perfis executados conforme esperado.';

  const report = `# QA Report — Permissions Matrix .env_qa

**Task ID:** qa_task_02_permissions_matrix_env_qa  
**Data/Hora:** ${now}  
**Status Geral:** ${finalStatus}

---

## Contexto

- **User Story:** Validar /api/me e /api/me/permissions para cada usuario .env_qa.
- **Ambiente:** ${baseUrl}
- **Tipos de teste:** UI + API
- **Autenticacao:** OIDC Logto via browser
- **Banco:** Nao executado; database.enabled=false no qa_session.json.

---

## Casos de Teste

| ID | Usuario | /api/me | /api/me/permissions | Permissoes | Authz Version | Primary Role | Status |
|----|---------|---------|---------------------|------------|---------------|--------------|--------|
${rows.join('\n')}

---

## Detalhes por Caso

${details.join('\n\n')}

---

## Resumo de Evidencias

\`\`\`
qa_task_02_permissions_matrix/
├── test_plan.md
├── playwright.config.mjs
├── qa_task_02_permissions_matrix.spec.mjs
├── execution-results.json
├── requests.log
├── screenshots/
└── videos/
\`\`\`

---

## Informacoes para o Orquestrador

**Status final:** ${finalStatus}
${failures}
`;

  fs.writeFileSync(reportPath, report);
}

fs.writeFileSync(
  requestsLogPath,
  [
    'QA Task 02 - Permissions matrix .env_qa',
    `Started: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    'Sanitization: Authorization, tokens, OIDC code/state, cookies and password values are masked.',
    '',
  ].join('\n'),
);

writeResults({
  taskId: 'qa_task_02',
  slug: 'permissions_matrix_env_qa',
  baseUrl,
  startedAt: new Date().toISOString(),
  profileCount: profiles.length,
  cases: [],
});

test.describe('qa_task_02 - permissions matrix .env_qa', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(credentialsPath)) {
      throw new Error('Arquivo .env_qa nao encontrado.');
    }
    if (profiles.length === 0) {
      throw new Error('Nenhum usuario QA_*_USERNAME encontrado em .env_qa.');
    }
    const missingPassword = profiles.find((profile) => !profile.password);
    if (missingPassword) {
      throw new Error(`Senha ausente para ${missingPassword.username}; esperado QA_${missingPassword.envKey}_PASSWORD ou QA_SHARED_PASSWORD.`);
    }
  });

  test.afterAll(() => {
    buildReport();
  });

  for (const profile of profiles) {
    test(`${profile.id}: ${profile.username}`, async ({ page }) => {
      const state = {
        bearerToken: null,
        bearerSeen: false,
        resolveBearer: null,
        bffOrigin: null,
        consoleMessages: [],
        pageErrors: [],
        screenshots: [],
      };

      const bearerTokenPromise = new Promise((resolve) => {
        state.resolveBearer = resolve;
      });

      attachObservers(page, profile, state);

      try {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await loginWithLogto(page, profile);
        state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.slug}_app_after_login.png`));

        const bearerToken = state.bearerToken || await Promise.race([
          bearerTokenPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Bearer token nao observado nas chamadas autenticadas do frontend.')), 30_000)),
        ]);

        const bffOrigin = state.bffOrigin || baseUrl;
        const meResponse = await callApi(profile, bearerToken, bffOrigin, '/api/me');
        const permissionsResponse = await callApi(profile, bearerToken, bffOrigin, '/api/me/permissions');
        const status = assertExpected(profile, meResponse, permissionsResponse);

    recordResult({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          noRoleProfile: isNoRoleProfile(profile),
          status,
          bearerSeen: state.bearerSeen,
          me: meResponse.summary,
          permissions: permissionsResponse.summary,
          screenshots: state.screenshots.filter(Boolean),
          consoleMessages: state.consoleMessages,
          pageErrors: state.pageErrors,
          completedAt: new Date().toISOString(),
        });

        appendRequestLog([
          `--- RESULTADO: ${status} ${profile.id} ${profile.username} ---`,
          `Expected: /api/me 2xx; /api/me/permissions valido; sem_papel com zero permissoes ou deny-safe.`,
          `Actual: /api/me HTTP ${meResponse.status}; /api/me/permissions HTTP ${permissionsResponse.status}; permissionCount ${permissionsResponse.summary.permissionCount}.`,
          '',
        ]);
      } catch (error) {
        const failureScreenshot = await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.slug}_fail.png`);
        recordResult({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          noRoleProfile: isNoRoleProfile(profile),
          status: 'FAIL',
          bearerSeen: state.bearerSeen,
          me: null,
          permissions: null,
          screenshots: [...state.screenshots.filter(Boolean), failureScreenshot].filter(Boolean),
          consoleMessages: state.consoleMessages,
          pageErrors: state.pageErrors,
          error: redactSensitiveText(error?.stack || error?.message || error),
          completedAt: new Date().toISOString(),
        });

        appendRequestLog([
          `--- RESULTADO: FAIL ${profile.id} ${profile.username} ---`,
          `Expected: login OIDC e matriz de permissoes valida.`,
          `Actual: ${redactSensitiveText(error?.message || error)}`,
          '',
        ]);

        throw error;
      }
    });
  }
});
