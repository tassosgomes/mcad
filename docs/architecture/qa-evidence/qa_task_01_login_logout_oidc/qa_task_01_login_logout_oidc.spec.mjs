import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const frontendRequire = createRequire(new URL('../../../../frontend/package.json', import.meta.url));
const { test, expect } = frontendRequire('@playwright/test');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = __dirname;
const screenshotsDir = path.join(evidenceDir, 'screenshots');
const requestsLogPath = path.join(evidenceDir, 'requests.log');
const resultsPath = path.join(evidenceDir, 'execution-results.json');

const baseUrl = process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br';
const sharedPassword = process.env.QA_SHARED_PASSWORD;

const profiles = [
  { id: 'CT-01', username: process.env.QA_ANALISTA_CADASTRO_USERNAME || 'analista_cadastro' },
  { id: 'CT-02', username: process.env.QA_ANALISTA_DISTRIBUICAO_USERNAME || 'analista_distribuicao' },
  { id: 'CT-03', username: process.env.QA_ANALISTA_IDENTIFICACAO_USERNAME || 'analista_identificacao' },
  { id: 'CT-04', username: process.env.QA_ANALISTA_ARRECADACAO_USERNAME || 'analista_arrecadacao' },
  { id: 'CT-05', username: process.env.QA_CONSULTOR_CADASTRO_USERNAME || 'consultor_cadastro' },
  { id: 'CT-06', username: process.env.QA_CONSULTOR_DISTRIBUICAO_USERNAME || 'consultor_distribuicao' },
  { id: 'CT-07', username: process.env.QA_CONSULTOR_IDENTIFICACAO_USERNAME || 'consultor_identificacao' },
  { id: 'CT-08', username: process.env.QA_CONSULTOR_ARRECADACAO_USERNAME || 'consultor_arrecadacao' },
];

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(path.join(evidenceDir, 'videos'), { recursive: true });
fs.writeFileSync(
  requestsLogPath,
  [
    'QA Task 01 - Login/logout OIDC',
    `Started: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    'Sanitization: Authorization, tokens, OIDC code/state, cookies and password values are masked.',
    '',
  ].join('\n'),
);
fs.writeFileSync(
  resultsPath,
  JSON.stringify(
    {
      taskId: 'qa_task_01',
      slug: 'login_logout_oidc',
      baseUrl,
      startedAt: new Date().toISOString(),
      cases: [],
    },
    null,
    2,
  ),
);

function redactSensitiveText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  let text = String(value);

  if (sharedPassword) {
    text = text.split(sharedPassword).join('[PASSWORD_MASKED]');
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

function isRelevantUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.origin === new URL(baseUrl).origin ||
      parsed.hostname.includes('logto.app') ||
      parsed.hostname.includes('mcad') ||
      parsed.pathname.includes('/api/me')
    );
  } catch {
    return false;
  }
}

function recordResult(entry) {
  const current = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  current.cases.push(entry);
  current.updatedAt = new Date().toISOString();
  fs.writeFileSync(resultsPath, JSON.stringify(current, null, 2));
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

function attachObservers(page, profile, state) {
  page.on('console', (message) => {
    state.consoleMessages.push(redactSensitiveText(`[${message.type()}] ${message.text()}`));
  });

  page.on('pageerror', (error) => {
    state.pageErrors.push(redactSensitiveText(error?.message || error));
  });

  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) {
      return;
    }

    try {
      const parsed = new URL(frame.url());
      if (parsed.origin === new URL(baseUrl).origin && parsed.pathname === '/callback') {
        state.callbackObserved = true;
        state.callbackQueryKeys = [...parsed.searchParams.keys()].sort();
      }
    } catch {
      // Ignore non-URL navigations.
    }
  });

  page.on('request', (request) => {
    const requestUrl = request.url();
    if (!isRelevantUrl(requestUrl)) {
      return;
    }

    const headers = request.headers();
    const authorization = headers.authorization || headers.Authorization;
    if (requestUrl.includes('/api/me/permissions') && /^Bearer\s+\S+/i.test(String(authorization || ''))) {
      state.bearerSeenOnPermissions = true;
    }

    appendRequestLog([
      '========================================',
      `${profile.id} ${profile.username} REQUEST`,
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
      '--- REQUEST FAILED ---',
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

    const lines = [
      `--- RESPONSE ${profile.id} ${profile.username} ---`,
      `Timestamp: ${new Date().toISOString()}`,
      `Status: ${response.status()}`,
      `URL: ${sanitizeUrl(responseUrl)}`,
      'Headers:',
      JSON.stringify(sanitizeHeaders(response.headers()), null, 2),
    ];

    if (response.request().method() === 'GET' && responseUrl.includes('/api/me/permissions')) {
      try {
        const bodyText = await response.text();
        lines.push('Body:', redactSensitiveText(bodyText).slice(0, 4000));
      } catch (error) {
        lines.push('Body: [unavailable]', `Body error: ${redactSensitiveText(error?.message || error)}`);
      }
    } else {
      lines.push('Body: [not captured for browser/OIDC flow]');
    }

    lines.push('');
    appendRequestLog(lines);
  });
}

async function loginWithLogto(page, profile) {
  await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });
  await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_idp_start.png`);

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

  await passwordInput.fill(sharedPassword);

  await Promise.all([
    page.waitForURL((url) => {
      const appOrigin = new URL(baseUrl).origin;
      return url.origin === appOrigin && url.pathname !== '/callback';
    }, { timeout: 60_000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

test.describe('qa_task_01 - login/logout OIDC', () => {
  test.beforeAll(() => {
    if (!sharedPassword) {
      throw new Error('QA_SHARED_PASSWORD must be provided at runtime.');
    }
  });

  for (const profile of profiles) {
    test(`${profile.id}: ${profile.username}`, async ({ page }) => {
      const state = {
        callbackObserved: false,
        callbackQueryKeys: [],
        bearerSeenOnPermissions: false,
        permissionsStatus: null,
        screenshots: [],
        consoleMessages: [],
        pageErrors: [],
      };

      attachObservers(page, profile, state);

      try {
        const permissionsResponsePromise = page.waitForResponse(
          (response) => response.request().method() === 'GET' && response.url().includes('/api/me/permissions'),
          { timeout: 70_000 },
        );

        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await loginWithLogto(page, profile);

        state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_app_after_login.png`));

        const permissionsResponse = await permissionsResponsePromise;
        state.permissionsStatus = permissionsResponse.status();

        expect(state.callbackObserved, 'Callback /callback nao observado no fluxo OIDC').toBeTruthy();
        expect(state.callbackQueryKeys, 'Callback nao contem parametros code/state').toEqual(expect.arrayContaining(['code', 'state']));
        expect(state.bearerSeenOnPermissions, 'Header Authorization Bearer nao observado em /api/me/permissions').toBeTruthy();
        expect(permissionsResponse.status(), `/api/me/permissions retornou HTTP ${permissionsResponse.status()}`).toBeGreaterThanOrEqual(200);
        expect(permissionsResponse.status(), `/api/me/permissions retornou HTTP ${permissionsResponse.status()}`).toBeLessThan(300);

        const permissionsPayload = await permissionsResponse.json();
        expect(typeof permissionsPayload.subjectId, 'subjectId ausente na resposta de permissions').toBe('string');
        expect(Array.isArray(permissionsPayload.permissions), 'permissions nao e array').toBeTruthy();
        expect(typeof permissionsPayload.version, 'version ausente na resposta de permissions').toBe('number');

        await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: 20_000 });
        state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_before_logout.png`));

        await page.getByRole('button', { name: 'Sair' }).click();
        await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === '/logout', { timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /Logout concluido/i })).toBeVisible({ timeout: 20_000 });
        state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_logout.png`));

        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });
        state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_after_logout_protected_route.png`));

        recordResult({
          id: profile.id,
          username: profile.username,
          status: 'PASS',
          callbackObserved: state.callbackObserved,
          callbackQueryKeys: state.callbackQueryKeys,
          bearerSeenOnPermissions: state.bearerSeenOnPermissions,
          permissionsStatus: state.permissionsStatus,
          screenshots: state.screenshots.filter(Boolean),
          consoleMessages: state.consoleMessages,
          pageErrors: state.pageErrors,
          completedAt: new Date().toISOString(),
        });
      } catch (error) {
        const failureScreenshot = await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_fail.png`);
        recordResult({
          id: profile.id,
          username: profile.username,
          status: 'FAIL',
          callbackObserved: state.callbackObserved,
          callbackQueryKeys: state.callbackQueryKeys,
          bearerSeenOnPermissions: state.bearerSeenOnPermissions,
          permissionsStatus: state.permissionsStatus,
          screenshots: [...state.screenshots.filter(Boolean), failureScreenshot].filter(Boolean),
          consoleMessages: state.consoleMessages,
          pageErrors: state.pageErrors,
          error: redactSensitiveText(error?.stack || error?.message || error),
          completedAt: new Date().toISOString(),
        });

        appendRequestLog([
          `--- RESULTADO: FAIL ${profile.id} ${profile.username} ---`,
          `Expected: login OIDC com callback, Bearer em /api/me/permissions e logout em /logout.`,
          `Actual: ${redactSensitiveText(error?.message || error)}`,
          '',
        ]);

        throw error;
      }
    });
  }
});
