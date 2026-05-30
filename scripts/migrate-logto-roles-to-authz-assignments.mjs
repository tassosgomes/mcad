#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const DEFAULT_CATALOG_PATH = 'seeds/mcad/roles.json';
const DEFAULT_ENV_QA_PATH = '.env_qa';
const DEFAULT_LOGTO_PAGE_SIZE = 100;
const ACTOR_SUBJECT = 'migration';

const DEFAULT_LEGACY_ROLE_ALIASES = {
  'analista-cadastro': ['cadastro.default.analista'],
  'analista-identificacao': ['identificacao.default.analista'],
  'analista-arrecadacao': ['arrecadacao.default.analista'],
  'analista-distribuicao': ['distribuicao.default.analista'],
  'consultor': [
    'cadastro.default.consultor',
    'identificacao.default.consultor',
    'arrecadacao.default.consultor',
    'distribuicao.default.consultor',
  ],
  'consultor-cadastro': ['cadastro.default.consultor'],
  'consultor-identificacao': ['identificacao.default.consultor'],
  'consultor-arrecadacao': ['arrecadacao.default.consultor'],
  'consultor-distribuicao': ['distribuicao.default.consultor'],
  'operador-distribuicao': ['distribuicao.default.operador'],
  'gerente-distribuicao': ['distribuicao.default.gerente'],
  'gestor-acessos': ['acessos.default.gestor'],
  'consultor-acessos': ['acessos.default.consultor'],
};

export function parseArgs(argv) {
  const options = {
    mode: null,
    catalogPath: DEFAULT_CATALOG_PATH,
    envQaPath: DEFAULT_ENV_QA_PATH,
    reportPath: process.env.AUTHZ_ASSIGNMENTS_MIGRATION_REPORT ?? null,
    logtoExportPath: null,
    pageSize: DEFAULT_LOGTO_PAGE_SIZE,
    correlationId: `authz-migration-${randomUUID()}`,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--dry-run':
        options.mode = 'dry-run';
        break;
      case '--apply':
        options.mode = 'apply';
        break;
      case '--catalog':
        options.catalogPath = requireValue(argv, ++index, arg);
        break;
      case '--env-qa':
        options.envQaPath = requireValue(argv, ++index, arg);
        break;
      case '--report':
      case '--report-path':
        options.reportPath = requireValue(argv, ++index, arg);
        break;
      case '--logto-export':
        options.logtoExportPath = requireValue(argv, ++index, arg);
        break;
      case '--page-size':
        options.pageSize = Number.parseInt(requireValue(argv, ++index, arg), 10);
        break;
      case '--correlation-id':
        options.correlationId = requireValue(argv, ++index, arg);
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.help && options.mode !== 'dry-run' && options.mode !== 'apply') {
    throw new Error('Choose exactly one mode: --dry-run or --apply');
  }

  if (!Number.isInteger(options.pageSize) || options.pageSize <= 0 || options.pageSize > 100) {
    throw new Error('--page-size must be an integer between 1 and 100');
  }

  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function createRoleCatalog(roles) {
  const byKey = new Map();
  const byLowerKey = new Map();

  for (const role of roles) {
    if (!role || typeof role.key !== 'string' || role.key.trim().length === 0) {
      throw new Error('Role catalog contains an item without key');
    }
    byKey.set(role.key, role);
    byLowerKey.set(role.key.toLowerCase(), role.key);
  }

  return { roles, byKey, byLowerKey };
}

export function parseEnvQaUsers(text) {
  const users = [];
  let current = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^-{3,}$/.test(trimmed)) {
      pushEnvQaUser(users, current);
      current = {};
      continue;
    }

    const normalized = stripDiacritics(trimmed).toLowerCase();
    const separator = trimmed.indexOf(':');
    if (separator < 0) continue;

    const value = trimmed.slice(separator + 1).trim();
    if (!value) continue;

    if (normalized.startsWith('hint:')) {
      current.hint = value;
    } else if (normalized.includes('e-mail:') || normalized.includes('email:')) {
      current.email = value;
    } else if (normalized.startsWith('nome de usuario:')) {
      current.username = value;
    }
  }

  pushEnvQaUser(users, current);
  return users;
}

function pushEnvQaUser(users, current) {
  if (current.hint || current.email || current.username) {
    users.push({
      hint: current.hint ?? null,
      email: current.email ?? null,
      username: current.username ?? null,
    });
  }
}

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function buildMigrationPlan({ logtoUsers, catalog, validationUsers = [] }) {
  const plannedAssignments = [];
  const unmappedRoles = [];
  const usersWithoutRole = [];
  const seenAssignments = new Set();
  const recognizedRoleNames = new Set();

  for (const user of logtoUsers) {
    const roles = extractLogtoRoles(user);
    if (roles.length === 0) {
      usersWithoutRole.push(sanitizeUserRef(user));
      continue;
    }

    for (const role of roles) {
      const roleName = readRoleName(role);
      if (!roleName) continue;

      const mappedRoleKeys = resolveLogtoRole(roleName, catalog);
      if (mappedRoleKeys.length === 0) {
        unmappedRoles.push({
          roleName,
          user: sanitizeUserRef(user),
        });
        continue;
      }

      recognizedRoleNames.add(roleName);

      for (const roleKey of mappedRoleKeys) {
        const dedupeKey = `${readLogtoUserId(user)}:${roleKey}`;
        if (seenAssignments.has(dedupeKey)) continue;
        seenAssignments.add(dedupeKey);

        plannedAssignments.push({
          logtoUserId: readLogtoUserId(user),
          username: readOptionalString(user.username),
          email: readOptionalString(user.primaryEmail) ?? readOptionalString(user.email),
          sourceRoleName: roleName,
          roleKey,
          roleDisplayName: catalog.byKey.get(roleKey)?.displayName ?? roleKey,
          expectedPermissionKeys: catalog.byKey.get(roleKey)?.permissionKeys ?? [],
        });
      }
    }
  }

  const validation = buildValidationPlan(validationUsers, plannedAssignments, unmappedRoles, logtoUsers);
  const blockingFindings = buildBlockingFindings(unmappedRoles, validation);

  return {
    usersScanned: logtoUsers.length,
    usersWithoutRole,
    rolesRecognized: recognizedRoleNames.size,
    rolesUnmapped: unmappedRoles,
    assignmentsPlanned: plannedAssignments,
    validationUsers: validation,
    blockingFindings,
  };
}

export function resolveLogtoRole(roleName, catalog) {
  if (catalog.byKey.has(roleName)) return [roleName];

  const lowerRoleName = roleName.toLowerCase();
  const exactLower = catalog.byLowerKey.get(lowerRoleName);
  if (exactLower) return [exactLower];

  const aliased = DEFAULT_LEGACY_ROLE_ALIASES[lowerRoleName] ?? [];
  const validAliases = aliased.filter((roleKey) => catalog.byKey.has(roleKey));
  if (validAliases.length > 0) return validAliases;

  const inferred = inferRoleKeysFromLegacyName(lowerRoleName, catalog);
  return inferred;
}

function inferRoleKeysFromLegacyName(roleName, catalog) {
  const tokens = roleName.split(/[-_.]+/).filter(Boolean);
  if (tokens.length < 2) return [];

  const candidates = [];
  const first = tokens[0];
  const rest = tokens.slice(1).join('-');
  candidates.push(`${rest}.default.${first}`);
  candidates.push(`${first}.default.${rest}`);

  return candidates.filter((candidate) => catalog.byKey.has(candidate));
}

function buildValidationPlan(validationUsers, plannedAssignments, unmappedRoles, logtoUsers) {
  return validationUsers.map((validationUser) => {
    const matchingAssignments = plannedAssignments.filter((assignment) =>
      matchesValidationUser(validationUser, assignment),
    );
    const matchingLogtoUser = logtoUsers.find((logtoUser) =>
      matchesValidationUser(validationUser, {
        logtoUserId: readLogtoUserId(logtoUser),
        username: readOptionalString(logtoUser.username),
        email: readOptionalString(logtoUser.primaryEmail) ?? readOptionalString(logtoUser.email),
      }),
    );
    const hasUnmappedRole = unmappedRoles.some((item) => matchesValidationUser(validationUser, item.user));

    return {
      ...sanitizeValidationUser(validationUser),
      status: matchingLogtoUser ? 'planned' : 'missing-from-logto-export',
      plannedRoleKeys: [...new Set(matchingAssignments.map((assignment) => assignment.roleKey))],
      expectedPermissionKeys: [
        ...new Set(matchingAssignments.flatMap((assignment) => assignment.expectedPermissionKeys)),
      ],
      hasUnmappedRole,
    };
  });
}

function matchesValidationUser(validationUser, userRef) {
  const email = lowerOrNull(validationUser.email);
  const username = normalizeUserName(validationUser.username);
  const hint = normalizeUserName(validationUser.hint);

  const refEmail = lowerOrNull(userRef.email);
  const refUsername = normalizeUserName(userRef.username);
  const refSubject = normalizeUserName(userRef.logtoUserId ?? userRef.subject ?? userRef.hint);

  return Boolean(
    (email && refEmail === email) ||
      (username && (refUsername === username || refSubject === username)) ||
      (hint && (refUsername === hint || refSubject === hint)),
  );
}

function buildBlockingFindings(unmappedRoles, validationUsers) {
  const findings = [];

  for (const item of unmappedRoles) {
    findings.push({
      code: 'UNMAPPED_LOGTO_ROLE',
      severity: 'blocking',
      message: `Logto role '${item.roleName}' has no official mapping in seeds/mcad/roles.json`,
      user: item.user,
    });
  }

  for (const item of validationUsers) {
    if (item.status === 'missing-from-logto-export') {
      findings.push({
        code: 'ENV_QA_USER_NOT_FOUND_IN_LOGTO_EXPORT',
        severity: 'blocking',
        message: 'Mandatory .env_qa user was not found in the Logto export',
        user: item,
      });
    }
    if (item.hasUnmappedRole) {
      findings.push({
        code: 'ENV_QA_USER_HAS_UNMAPPED_ROLE',
        severity: 'blocking',
        message: 'Mandatory .env_qa user has at least one unmapped Logto role',
        user: item,
      });
    }
  }

  return findings;
}

export async function applyAssignments({ authzClient, assignments, correlationId }) {
  const results = [];

  for (const assignment of assignments) {
    const authzUser = await authzClient.resolveUser(assignment);
    if (!authzUser) {
      results.push({
        ...assignment,
        outcome: 'failed',
        status: null,
        error: 'AUTHZ_USER_NOT_FOUND',
      });
      continue;
    }

    const response = await authzClient.assignRole({
      userId: authzUser.id,
      roleKey: assignment.roleKey,
      correlationId,
    });

    if ([200, 201, 204].includes(response.status)) {
      results.push({ ...assignment, authzUserId: authzUser.id, outcome: 'created', status: response.status });
    } else if (response.status === 409) {
      results.push({
        ...assignment,
        authzUserId: authzUser.id,
        outcome: 'already-existing',
        status: response.status,
      });
    } else {
      results.push({
        ...assignment,
        authzUserId: authzUser.id,
        outcome: 'failed',
        status: response.status,
        error: response.body?.code ?? response.body?.message ?? 'AUTHZ_ASSIGNMENT_FAILED',
      });
    }
  }

  return results;
}

export function mergeApplyResults(plan, applyResults, validationResults = []) {
  const failedAssignments = applyResults.filter((item) => item.outcome === 'failed');
  const blockingFindings = [
    ...plan.blockingFindings,
    ...failedAssignments.map((item) => ({
      code: item.error ?? 'AUTHZ_ASSIGNMENT_FAILED',
      severity: 'blocking',
      message: `Assignment '${item.roleKey}' could not be applied`,
      user: sanitizeUserRef(item),
    })),
    ...validationResults.flatMap((item) => item.blockingFindings ?? []),
  ];

  return {
    ...plan,
    assignmentsCreated: applyResults.filter((item) => item.outcome === 'created'),
    assignmentsAlreadyExisting: applyResults.filter((item) => item.outcome === 'already-existing'),
    assignmentsFailed: failedAssignments,
    validationUsers: validationResults.length > 0 ? validationResults : plan.validationUsers,
    blockingFindings,
  };
}

export async function captureValidationPermissions({ authzClient, validationUsers, assignments }) {
  const snapshots = [];

  for (const validationUser of validationUsers) {
    const representative = assignments.find((assignment) =>
      matchesValidationUser(validationUser, assignment),
    );

    if (!representative) {
      snapshots.push({
        ...validationUser,
        beforePermissions: [],
        beforePermissionCount: null,
      });
      continue;
    }

    const authzUser = await authzClient.resolveUser(representative);
    if (!authzUser) {
      snapshots.push({
        ...validationUser,
        beforePermissions: [],
        beforePermissionCount: null,
      });
      continue;
    }

    const before = await authzClient.getEffectivePermissions(authzUser.id);
    snapshots.push({
      ...validationUser,
      beforePermissions: before.permissions,
      beforePermissionCount: before.permissions.length,
    });
  }

  return snapshots;
}

export async function validateEffectivePermissions({ authzClient, validationUsers, assignments }) {
  const results = [];

  for (const validationUser of validationUsers) {
    const matchingAssignments = assignments.filter((assignment) =>
      matchesValidationUser(validationUser, assignment),
    );
    const representative = matchingAssignments[0];

    if (!representative) {
      results.push({
        ...validationUser,
        status: validationUser.status,
        beforePermissionCount: null,
        afterPermissionCount: null,
        blockingFindings: [],
      });
      continue;
    }

    const authzUser = await authzClient.resolveUser(representative);
    if (!authzUser) {
      results.push({
        ...validationUser,
        status: 'authz-user-not-found',
        beforePermissionCount: null,
        afterPermissionCount: null,
        blockingFindings: [
          {
            code: 'ENV_QA_AUTHZ_USER_NOT_FOUND',
            severity: 'blocking',
            message: 'Mandatory .env_qa user was not found in ecad-authz',
            user: validationUser,
          },
        ],
      });
      continue;
    }

    const beforePermissions = Array.isArray(validationUser.beforePermissions)
      ? validationUser.beforePermissions
      : (await authzClient.getEffectivePermissions(authzUser.id)).permissions;
    const after = await authzClient.getEffectivePermissions(authzUser.id);
    const beforeSet = new Set(beforePermissions);
    const afterSet = new Set(after.permissions);
    const expected = new Set(validationUser.expectedPermissionKeys ?? []);
    const missingExpected = [...expected].filter((permission) => !afterSet.has(permission));
    const lostPermissions = [...beforeSet].filter((permission) => !afterSet.has(permission));
    const blockingFindings = [];

    if (missingExpected.length > 0) {
      blockingFindings.push({
        code: 'ENV_QA_EXPECTED_PERMISSION_MISSING_AFTER_APPLY',
        severity: 'blocking',
        message: 'Effective permissions after apply do not include all expected catalog permissions',
        missingPermissionCount: missingExpected.length,
        user: validationUser,
      });
    }

    if (lostPermissions.length > 0) {
      blockingFindings.push({
        code: 'ENV_QA_PERMISSION_LOSS_AFTER_APPLY',
        severity: 'blocking',
        message: 'Effective permissions after apply lost permissions that existed before apply',
        lostPermissionCount: lostPermissions.length,
        user: validationUser,
      });
    }

    results.push({
      ...validationUser,
      status: blockingFindings.length === 0 ? 'validated' : 'failed',
      beforePermissionCount: beforePermissions.length,
      afterPermissionCount: after.permissions.length,
      missingExpectedPermissionCount: missingExpected.length,
      lostPermissionCount: lostPermissions.length,
      blockingFindings,
    });
  }

  return results;
}

export function renderMarkdownReport({ mode, correlationId, startedAt, finishedAt, result }) {
  const lines = [];
  const created = result.assignmentsCreated ?? [];
  const existing = result.assignmentsAlreadyExisting ?? [];
  const failed = result.assignmentsFailed ?? [];

  lines.push('# Logto roles -> ecad-authz assignments migration report');
  lines.push('');
  lines.push(`- mode: ${mode}`);
  lines.push(`- correlationId: ${correlationId}`);
  lines.push(`- startedAt: ${startedAt}`);
  lines.push(`- finishedAt: ${finishedAt}`);
  lines.push(`- usersScanned: ${result.usersScanned}`);
  lines.push(`- rolesRecognized: ${result.rolesRecognized}`);
  lines.push(`- rolesUnmapped: ${result.rolesUnmapped.length}`);
  lines.push(`- usersWithoutRole: ${result.usersWithoutRole.length}`);
  lines.push(`- assignmentsPlanned: ${result.assignmentsPlanned.length}`);
  lines.push(`- assignmentsCreated: ${created.length}`);
  lines.push(`- assignmentsAlreadyExisting: ${existing.length}`);
  lines.push(`- assignmentsFailed: ${failed.length}`);
  lines.push(`- validationUsers: ${result.validationUsers.length}`);
  lines.push(`- blockingFindings: ${result.blockingFindings.length}`);
  lines.push('');

  lines.push('## Blocking findings');
  lines.push('');
  if (result.blockingFindings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of result.blockingFindings) {
      lines.push(`- ${finding.code}: ${finding.message}`);
    }
  }
  lines.push('');

  lines.push('## Unmapped roles');
  lines.push('');
  if (result.rolesUnmapped.length === 0) {
    lines.push('- none');
  } else {
    for (const item of result.rolesUnmapped) {
      lines.push(`- ${item.roleName} for ${formatUserRef(item.user)}`);
    }
  }
  lines.push('');

  lines.push('## Planned assignments');
  lines.push('');
  if (result.assignmentsPlanned.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| user | sourceRole | roleKey |');
    lines.push('|---|---|---|');
    for (const assignment of result.assignmentsPlanned) {
      lines.push(
        `| ${formatUserRef(assignment)} | ${assignment.sourceRoleName} | ${assignment.roleKey} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Validation users');
  lines.push('');
  if (result.validationUsers.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| user | status | plannedRoles | beforePermissions | afterPermissions |');
    lines.push('|---|---|---:|---:|---:|');
    for (const user of result.validationUsers) {
      lines.push(
        `| ${formatUserRef(user)} | ${user.status} | ${user.plannedRoleKeys?.length ?? 0} | ${formatCount(user.beforePermissionCount)} | ${formatCount(user.afterPermissionCount)} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Rollback procedure');
  lines.push('');
  lines.push('1. Keep this report and the original Logto export as immutable evidence.');
  lines.push('2. If apply was executed, remove only assignments listed here as created in this run.');
  lines.push('3. Re-run this script with --dry-run and confirm blockingFindings returns to zero before another apply.');
  lines.push('4. Do not recreate Logto roles as an authorization source; use ecad-authz official assignment APIs.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function formatCount(value) {
  return typeof value === 'number' ? String(value) : 'n/a';
}

function formatUserRef(user) {
  const parts = [];
  if (user.hint) parts.push(`hint=${user.hint}`);
  if (user.username) parts.push(`username=${user.username}`);
  if (user.email) parts.push(`email=${maskEmail(user.email)}`);
  if (user.logtoUserId && parts.length === 0) parts.push(`logtoUserId=${user.logtoUserId}`);
  return parts.length > 0 ? parts.join(' ') : 'unknown';
}

function sanitizeValidationUser(user) {
  return {
    hint: readOptionalString(user.hint),
    username: readOptionalString(user.username),
    email: readOptionalString(user.email),
  };
}

function sanitizeUserRef(user) {
  return {
    logtoUserId: readOptionalString(user.logtoUserId) ?? readLogtoUserId(user),
    username: readOptionalString(user.username),
    email: readOptionalString(user.email) ?? readOptionalString(user.primaryEmail),
  };
}

function extractLogtoRoles(user) {
  if (Array.isArray(user.roles)) return user.roles;
  if (Array.isArray(user.roleKeys)) return user.roleKeys.map((roleKey) => ({ name: roleKey }));
  return [];
}

function readRoleName(role) {
  if (typeof role === 'string') return role.trim();
  return (
    readOptionalString(role?.name) ??
    readOptionalString(role?.key) ??
    readOptionalString(role?.roleKey) ??
    readOptionalString(role?.id)
  );
}

function readLogtoUserId(user) {
  const id = readOptionalString(user.id) ?? readOptionalString(user.logtoUserId);
  if (!id) throw new Error('Logto user is missing id');
  return id;
}

function readOptionalString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function lowerOrNull(value) {
  return readOptionalString(value)?.toLowerCase() ?? null;
}

function normalizeUserName(value) {
  return lowerOrNull(value)?.replace(/[._]/g, '-') ?? null;
}

function maskEmail(email) {
  const value = readOptionalString(email);
  if (!value || !value.includes('@')) return value ?? '';
  const [local, domain] = value.split('@');
  const visible = local.length <= 2 ? local[0] ?? '*' : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

export function summarizeForConsole(result) {
  return {
    usersScanned: result.usersScanned,
    rolesRecognized: result.rolesRecognized,
    rolesUnmapped: result.rolesUnmapped.length,
    assignmentsPlanned: result.assignmentsPlanned.length,
    assignmentsCreated: result.assignmentsCreated?.length ?? 0,
    assignmentsAlreadyExisting: result.assignmentsAlreadyExisting?.length ?? 0,
    assignmentsFailed: result.assignmentsFailed?.length ?? 0,
    validationUsers: result.validationUsers.length,
    blockingFindings: result.blockingFindings.length,
  };
}

class LogtoClient {
  constructor({ managementApi, clientId, clientSecret, token, pageSize, fetchImpl = fetch }) {
    this.managementApi = managementApi?.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = token;
    this.pageSize = pageSize;
    this.fetchImpl = fetchImpl;
  }

  async listUsersWithRoles() {
    const token = await this.getToken();
    const users = await this.listUsers(token);
    return Promise.all(
      users.map(async (user) => ({
        ...user,
        roles: await this.listUserRoles(user.id, token),
      })),
    );
  }

  async getToken() {
    if (this.token) return this.token;
    if (!this.managementApi || !this.clientId || !this.clientSecret) {
      throw new Error(
        'Set LOGTO_MANAGEMENT_API with LOGTO_MANAGEMENT_TOKEN or LOGTO_M2M_CLIENT_ID/LOGTO_M2M_CLIENT_SECRET',
      );
    }

    const baseUrl = this.managementApi.replace(/\/api\/?$/, '');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      resource: this.managementApi,
      scope: 'all',
    });
    const response = await this.fetchImpl(`${baseUrl}/oidc/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`Logto token request failed with status ${response.status}`);
    }
    const payload = await response.json();
    if (!payload.access_token) {
      throw new Error('Logto token response missing access_token');
    }
    return payload.access_token;
  }

  async listUsers(token) {
    const users = [];
    let page = 1;
    while (true) {
      const batch = await this.api(`/users?page=${page}&page_size=${this.pageSize}`, token);
      if (!Array.isArray(batch)) {
        throw new Error('Logto users response must be an array');
      }
      users.push(...batch);
      if (batch.length < this.pageSize) break;
      page += 1;
    }
    return users;
  }

  async listUserRoles(userId, token) {
    return this.api(`/users/${encodeURIComponent(userId)}/roles`, token);
  }

  async api(pathname, token) {
    const response = await this.fetchImpl(`${this.managementApi}${pathname}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Logto API request failed with status ${response.status}: ${pathname}`);
    }
    return response.json();
  }
}

class AuthzClient {
  constructor({ baseUrl, token, fetchImpl = fetch }) {
    if (!baseUrl || !token) {
      throw new Error('Set AUTHZ_BASE_URL and AUTHZ_ADMIN_TOKEN for --apply');
    }
    this.baseUrl = `${baseUrl.replace(/\/$/, '')}/v1`;
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.userCache = new Map();
  }

  async resolveUser(assignment) {
    const cacheKey = assignment.logtoUserId;
    if (this.userCache.has(cacheKey)) return this.userCache.get(cacheKey);

    const queries = [
      assignment.logtoUserId,
      assignment.email,
      assignment.username,
    ].filter(Boolean);

    for (const query of queries) {
      const response = await this.request(`/users?q=${encodeURIComponent(query)}&size=20`);
      if (response.status !== 200) continue;
      const content = getPageContent(response.body);
      const found = content.find((candidate) => matchesAuthzUser(candidate, assignment));
      if (found) {
        const user = { id: found.id, raw: found };
        this.userCache.set(cacheKey, user);
        return user;
      }
    }

    this.userCache.set(cacheKey, null);
    return null;
  }

  async assignRole({ userId, roleKey, correlationId }) {
    return this.request(`/users/${encodeURIComponent(userId)}/roles`, {
      method: 'POST',
      body: { roleKey },
      correlationId,
    });
  }

  async getEffectivePermissions(userId) {
    const response = await this.request(`/users/${encodeURIComponent(userId)}/effective-permissions`);
    if (response.status !== 200) {
      return { permissions: [] };
    }
    return { permissions: parsePermissionList(response.body) };
  }

  async request(pathname, init = {}) {
    const headers = {
      authorization: `Bearer ${this.token}`,
      accept: 'application/json',
      'x-actor-subject': ACTOR_SUBJECT,
    };
    if (init.correlationId) headers['x-correlation-id'] = init.correlationId;
    let body;
    if (init.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
      method: init.method ?? 'GET',
      headers,
      body,
    });
    let parsedBody = null;
    if (response.status !== 204) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    }
    return { status: response.status, body: parsedBody };
  }
}

function getPageContent(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function matchesAuthzUser(candidate, assignment) {
  const candidateEmail = lowerOrNull(candidate.email);
  const candidateSubject = normalizeUserName(candidate.subject ?? candidate.idpSubject ?? candidate.id);
  const candidateUsername = normalizeUserName(candidate.username);
  const assignmentSubject = normalizeUserName(assignment.logtoUserId);
  const assignmentUsername = normalizeUserName(assignment.username);
  const assignmentEmail = lowerOrNull(assignment.email);

  return Boolean(
    (assignmentEmail && candidateEmail === assignmentEmail) ||
      (assignmentSubject && candidateSubject === assignmentSubject) ||
      (assignmentUsername && candidateUsername === assignmentUsername),
  );
}

function parsePermissionList(body) {
  if (Array.isArray(body)) return body.filter((item) => typeof item === 'string');
  if (Array.isArray(body?.permissions)) {
    return body.permissions
      .map((item) => (typeof item === 'string' ? item : item?.key))
      .filter((item) => typeof item === 'string');
  }
  return [];
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function loadLogtoUsers(options) {
  if (options.logtoExportPath) {
    const exported = await loadJson(options.logtoExportPath);
    if (Array.isArray(exported)) return exported;
    if (Array.isArray(exported.users)) return exported.users;
    throw new Error('--logto-export must contain an array or { "users": [...] }');
  }

  const client = new LogtoClient({
    managementApi: process.env.LOGTO_MANAGEMENT_API,
    clientId: process.env.LOGTO_M2M_CLIENT_ID,
    clientSecret: process.env.LOGTO_M2M_CLIENT_SECRET,
    token: process.env.LOGTO_MANAGEMENT_TOKEN,
    pageSize: options.pageSize,
  });
  return client.listUsersWithRoles();
}

async function loadValidationUsers(envQaPath) {
  try {
    return parseEnvQaUsers(await readFile(envQaPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function usage() {
  return `Usage:
  node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run [--report path]
  node scripts/migrate-logto-roles-to-authz-assignments.mjs --apply --report path

Options:
  --dry-run                 Build the plan and report without writing to ecad-authz.
  --apply                   Create assignments through ecad-authz official APIs.
  --catalog <path>          Role catalog path. Default: ${DEFAULT_CATALOG_PATH}
  --env-qa <path>           QA users file. Default: ${DEFAULT_ENV_QA_PATH}
  --report <path>           Write a Markdown migration report.
                            Defaults to AUTHZ_ASSIGNMENTS_MIGRATION_REPORT when set.
  --logto-export <path>     Read a captured Logto export instead of calling Logto.
  --page-size <1..100>      Logto users page size. Default: ${DEFAULT_LOGTO_PAGE_SIZE}
  --correlation-id <value>  Correlation id for the report and ecad-authz requests.
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const catalog = createRoleCatalog(await loadJson(options.catalogPath));
  const validationUsers = await loadValidationUsers(options.envQaPath);
  const logtoUsers = await loadLogtoUsers(options);
  const plan = buildMigrationPlan({ logtoUsers, catalog, validationUsers });

  let result = plan;
  if (options.mode === 'apply') {
    if (plan.blockingFindings.length > 0) {
      result = {
        ...plan,
        assignmentsCreated: [],
        assignmentsAlreadyExisting: [],
        assignmentsFailed: [],
      };
    } else {
      const authzClient = new AuthzClient({
        baseUrl: process.env.AUTHZ_BASE_URL,
        token: process.env.AUTHZ_ADMIN_TOKEN,
      });
      const validationBeforeApply = await captureValidationPermissions({
        authzClient,
        validationUsers: plan.validationUsers,
        assignments: plan.assignmentsPlanned,
      });
      const applyResults = await applyAssignments({
        authzClient,
        assignments: plan.assignmentsPlanned,
        correlationId: options.correlationId,
      });
      const validationResults = await validateEffectivePermissions({
        authzClient,
        validationUsers: validationBeforeApply,
        assignments: plan.assignmentsPlanned,
      });
      result = mergeApplyResults(plan, applyResults, validationResults);
    }
  }

  const finishedAt = new Date().toISOString();
  const report = renderMarkdownReport({
    mode: options.mode,
    correlationId: options.correlationId,
    startedAt,
    finishedAt,
    result,
  });

  if (options.reportPath) {
    await writeFile(options.reportPath, report, 'utf8');
  }

  process.stdout.write(`${JSON.stringify(summarizeForConsole(result), null, 2)}\n`);
  if (options.reportPath) {
    process.stdout.write(`Report written to ${options.reportPath}\n`);
  }

  if (result.blockingFindings.length > 0) {
    process.exitCode = 3;
  }
}

function isMainModule() {
  const argvPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  return argvPath ? import.meta.url === pathToFileURL(argvPath).href : false;
}

if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
