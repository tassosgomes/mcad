#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const repoRoot = process.cwd();
const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = frontendRequire('playwright');

const envQaPath = path.join(repoRoot, '.env_qa');
const baseUrl = process.env.QA_BASE_URL || 'https://mcad.tasso.dev.br';
const targetUsername = process.env.QA_TOKEN_USERNAME || 'admin_authz';
const outputPath = process.env.QA_TOKEN_OUTPUT || '/tmp/mcad-authz-admin.token';

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
  const rawCredentials = fs.readFileSync(envQaPath, 'utf8');
  const env = parseEnvFile(envQaPath);
  const sharedPassword = env.get('QA_SHARED_PASSWORD') || env.get('QA_PASSWORD') || '';
  const profiles = [];

  for (const [key, username] of env.entries()) {
    const match = key.match(/^QA_(.+)_USERNAME$/);
    if (!match) {
      continue;
    }
    const rawKey = match[1];
    profiles.push({
      slug: normalizeProfileKey(rawKey),
      username,
      email: env.get(`QA_${rawKey}_EMAIL`) || null,
      password: env.get(`QA_${rawKey}_PASSWORD`) || sharedPassword,
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
          slug: normalizeProfileKey(profile.hint || profile.username),
          username: profile.username,
          email: profile.email || null,
          password: profile.password,
        });
      }
    }
  }

  return profiles;
}

async function loginWithLogto(page, profile) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => url.hostname.includes('logto.app'), { timeout: 30_000 });

  const identifierInput = page.locator('input').first();
  await identifierInput.waitFor({ state: 'visible', timeout: 20_000 });
  await page.evaluate(() => {
    document.querySelectorAll('form').forEach((form) => {
      form.noValidate = true;
    });
  });
  await identifierInput.fill(profile.username);

  const passwordInput = page.locator('input[type="password"]');
  if (!(await passwordInput.isVisible().catch(() => false))) {
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

function fingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

async function main() {
  const profile = loadProfiles().find((item) => item.username === targetUsername || item.slug === targetUsername);
  if (!profile) {
    throw new Error(`QA profile not found: ${targetUsername}`);
  }

  let bearerToken = null;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('request', (request) => {
    const authorization = request.headers().authorization;
    const match = String(authorization || '').match(/^Bearer\s+(.+)$/i);
    if (match && request.url().includes('/api/me') && !bearerToken) {
      bearerToken = match[1];
    }
  });

  await loginWithLogto(page, profile);
  await page.waitForTimeout(3000);
  if (!bearerToken) {
    await page.goto(new URL('/api/me/permissions', baseUrl).toString()).catch(() => {});
    await page.waitForTimeout(3000);
  }
  await browser.close();

  if (!bearerToken) {
    throw new Error(`No bearer token captured for ${targetUsername}`);
  }

  fs.writeFileSync(outputPath, bearerToken, { mode: 0o600 });
  console.log(`captured_token user=${targetUsername} output=${outputPath} fingerprint=${fingerprint(bearerToken)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
