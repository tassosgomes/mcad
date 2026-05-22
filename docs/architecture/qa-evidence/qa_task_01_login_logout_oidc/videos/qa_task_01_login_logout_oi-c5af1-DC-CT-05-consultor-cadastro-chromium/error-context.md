# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa_task_01_login_logout_oidc.spec.mjs >> qa_task_01 - login/logout OIDC >> CT-05: consultor_cadastro
- Location: qa_task_01_login_logout_oidc.spec.mjs:278:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

```
Error: page.waitForResponse: Test ended.
```

# Page snapshot

```yaml
- generic [active]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]: Sign in to your account
      - generic [ref=e7]:
        - generic [ref=e9]:
          - generic [ref=e10]:
            - generic:
              - button "+1":
                - generic: "+1"
                - img
            - textbox [ref=e11]: consultor_cadastro
          - generic:
            - group
            - generic: Email / Username
        - generic [ref=e13]:
          - textbox [ref=e15]: [PASSWORD_MASKED]
          - generic:
            - group
            - generic: Password
        - alert [ref=e16]: Incorrect account or password. Please check your input.
        - generic [ref=e17] [cursor=pointer]: Forgot your password?
        - button "Sign in" [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: Sign in
    - link "Powered By Logto" [ref=e21] [cursor=pointer]:
      - /url: https://logto.io/?utm_source=sign_in&utm_medium=powered_by
      - generic [ref=e22]: Powered by
      - img [ref=e23]
  - generic [ref=e31]:
    - img [ref=e33]
    - text: You're in development mode
```

# Test source

```ts
  192 |     ]);
  193 |   });
  194 | 
  195 |   page.on('requestfailed', (request) => {
  196 |     appendRequestLog([
  197 |       '--- REQUEST FAILED ---',
  198 |       `${profile.id} ${profile.username}`,
  199 |       `Method: ${request.method()}`,
  200 |       `URL: ${sanitizeUrl(request.url())}`,
  201 |       `Failure: ${redactSensitiveText(request.failure()?.errorText || 'unknown')}`,
  202 |       '',
  203 |     ]);
  204 |   });
  205 | 
  206 |   page.on('response', async (response) => {
  207 |     const responseUrl = response.url();
  208 |     if (!isRelevantUrl(responseUrl)) {
  209 |       return;
  210 |     }
  211 | 
  212 |     const lines = [
  213 |       `--- RESPONSE ${profile.id} ${profile.username} ---`,
  214 |       `Timestamp: ${new Date().toISOString()}`,
  215 |       `Status: ${response.status()}`,
  216 |       `URL: ${sanitizeUrl(responseUrl)}`,
  217 |       'Headers:',
  218 |       JSON.stringify(sanitizeHeaders(response.headers()), null, 2),
  219 |     ];
  220 | 
  221 |     if (response.request().method() === 'GET' && responseUrl.includes('/api/me/permissions')) {
  222 |       try {
  223 |         const bodyText = await response.text();
  224 |         lines.push('Body:', redactSensitiveText(bodyText).slice(0, 4000));
  225 |       } catch (error) {
  226 |         lines.push('Body: [unavailable]', `Body error: ${redactSensitiveText(error?.message || error)}`);
  227 |       }
  228 |     } else {
  229 |       lines.push('Body: [not captured for browser/OIDC flow]');
  230 |     }
  231 | 
  232 |     lines.push('');
  233 |     appendRequestLog(lines);
  234 |   });
  235 | }
  236 | 
  237 | async function loginWithLogto(page, profile) {
  238 |   await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });
  239 |   await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_idp_start.png`);
  240 | 
  241 |   const identifierInput = page.locator('input').first();
  242 |   await identifierInput.waitFor({ state: 'visible', timeout: 20_000 });
  243 | 
  244 |   await page.evaluate(() => {
  245 |     document.querySelectorAll('form').forEach((form) => {
  246 |       form.noValidate = true;
  247 |     });
  248 |   });
  249 | 
  250 |   await identifierInput.fill(profile.username);
  251 | 
  252 |   const passwordInput = page.locator('input[type="password"]');
  253 |   const passwordVisible = await passwordInput.isVisible().catch(() => false);
  254 |   if (!passwordVisible) {
  255 |     await page.locator('button[type="submit"]').first().click();
  256 |     await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });
  257 |   }
  258 | 
  259 |   await passwordInput.fill(sharedPassword);
  260 | 
  261 |   await Promise.all([
  262 |     page.waitForURL((url) => {
  263 |       const appOrigin = new URL(baseUrl).origin;
  264 |       return url.origin === appOrigin && url.pathname !== '/callback';
  265 |     }, { timeout: 60_000 }),
  266 |     page.locator('button[type="submit"]').first().click(),
  267 |   ]);
  268 | }
  269 | 
  270 | test.describe('qa_task_01 - login/logout OIDC', () => {
  271 |   test.beforeAll(() => {
  272 |     if (!sharedPassword) {
  273 |       throw new Error('QA_SHARED_PASSWORD must be provided at runtime.');
  274 |     }
  275 |   });
  276 | 
  277 |   for (const profile of profiles) {
  278 |     test(`${profile.id}: ${profile.username}`, async ({ page }) => {
  279 |       const state = {
  280 |         callbackObserved: false,
  281 |         callbackQueryKeys: [],
  282 |         bearerSeenOnPermissions: false,
  283 |         permissionsStatus: null,
  284 |         screenshots: [],
  285 |         consoleMessages: [],
  286 |         pageErrors: [],
  287 |       };
  288 | 
  289 |       attachObservers(page, profile, state);
  290 | 
  291 |       try {
> 292 |         const permissionsResponsePromise = page.waitForResponse(
      |                                                 ^ Error: page.waitForResponse: Test ended.
  293 |           (response) => response.request().method() === 'GET' && response.url().includes('/api/me/permissions'),
  294 |           { timeout: 70_000 },
  295 |         );
  296 | 
  297 |         await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  298 |         await loginWithLogto(page, profile);
  299 | 
  300 |         state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_app_after_login.png`));
  301 | 
  302 |         const permissionsResponse = await permissionsResponsePromise;
  303 |         state.permissionsStatus = permissionsResponse.status();
  304 | 
  305 |         expect(state.callbackObserved, 'Callback /callback nao observado no fluxo OIDC').toBeTruthy();
  306 |         expect(state.callbackQueryKeys, 'Callback nao contem parametros code/state').toEqual(expect.arrayContaining(['code', 'state']));
  307 |         expect(state.bearerSeenOnPermissions, 'Header Authorization Bearer nao observado em /api/me/permissions').toBeTruthy();
  308 |         expect(permissionsResponse.status(), `/api/me/permissions retornou HTTP ${permissionsResponse.status()}`).toBeGreaterThanOrEqual(200);
  309 |         expect(permissionsResponse.status(), `/api/me/permissions retornou HTTP ${permissionsResponse.status()}`).toBeLessThan(300);
  310 | 
  311 |         const permissionsPayload = await permissionsResponse.json();
  312 |         expect(typeof permissionsPayload.subjectId, 'subjectId ausente na resposta de permissions').toBe('string');
  313 |         expect(Array.isArray(permissionsPayload.permissions), 'permissions nao e array').toBeTruthy();
  314 |         expect(typeof permissionsPayload.version, 'version ausente na resposta de permissions').toBe('number');
  315 | 
  316 |         await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: 20_000 });
  317 |         state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_before_logout.png`));
  318 | 
  319 |         await page.getByRole('button', { name: 'Sair' }).click();
  320 |         await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === '/logout', { timeout: 60_000 });
  321 |         await expect(page.getByRole('heading', { name: /Logout concluido/i })).toBeVisible({ timeout: 20_000 });
  322 |         state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_logout.png`));
  323 | 
  324 |         await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  325 |         await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });
  326 |         state.screenshots.push(await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_after_logout_protected_route.png`));
  327 | 
  328 |         recordResult({
  329 |           id: profile.id,
  330 |           username: profile.username,
  331 |           status: 'PASS',
  332 |           callbackObserved: state.callbackObserved,
  333 |           callbackQueryKeys: state.callbackQueryKeys,
  334 |           bearerSeenOnPermissions: state.bearerSeenOnPermissions,
  335 |           permissionsStatus: state.permissionsStatus,
  336 |           screenshots: state.screenshots.filter(Boolean),
  337 |           consoleMessages: state.consoleMessages,
  338 |           pageErrors: state.pageErrors,
  339 |           completedAt: new Date().toISOString(),
  340 |         });
  341 |       } catch (error) {
  342 |         const failureScreenshot = await saveScreenshot(page, `${profile.id.toLowerCase()}_${profile.username}_fail.png`);
  343 |         recordResult({
  344 |           id: profile.id,
  345 |           username: profile.username,
  346 |           status: 'FAIL',
  347 |           callbackObserved: state.callbackObserved,
  348 |           callbackQueryKeys: state.callbackQueryKeys,
  349 |           bearerSeenOnPermissions: state.bearerSeenOnPermissions,
  350 |           permissionsStatus: state.permissionsStatus,
  351 |           screenshots: [...state.screenshots.filter(Boolean), failureScreenshot].filter(Boolean),
  352 |           consoleMessages: state.consoleMessages,
  353 |           pageErrors: state.pageErrors,
  354 |           error: redactSensitiveText(error?.stack || error?.message || error),
  355 |           completedAt: new Date().toISOString(),
  356 |         });
  357 | 
  358 |         appendRequestLog([
  359 |           `--- RESULTADO: FAIL ${profile.id} ${profile.username} ---`,
  360 |           `Expected: login OIDC com callback, Bearer em /api/me/permissions e logout em /logout.`,
  361 |           `Actual: ${redactSensitiveText(error?.message || error)}`,
  362 |           '',
  363 |         ]);
  364 | 
  365 |         throw error;
  366 |       }
  367 |     });
  368 |   }
  369 | });
  370 | 
```