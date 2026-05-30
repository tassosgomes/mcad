#!/usr/bin/env node

const baseUrl = (process.env.AUTHZ_BASE_URL || process.env.DEV_AUTHZ_BASE_URL || 'https://mcad-authz.tasso.dev.br').replace(/\/$/, '');
const token = process.env.AUTHZ_ADMIN_TOKEN;
const apply = process.argv.includes('--apply');
const masterRoleKey = process.env.AUTHZ_QA_MASTER_ROLE_KEY || 'mcad.default.master';
const masterAssigneeEmail = process.env.AUTHZ_QA_MASTER_EMAIL || 'admin_authz@mcad.dev';

if (!token) {
  throw new Error('AUTHZ_ADMIN_TOKEN is required');
}

const qaUsers = [
  { username: 'admin_authz', email: 'admin_authz@mcad.dev' },
  { username: 'admin_authz2', email: 'admin_authz2@mcad.dev' },
  { username: 'analista_distribuicao', email: 'analista_distribuicao@mcad.dev' },
  { username: 'consultor_acessosdev', email: 'consultor-acessos.dev@mcad.local' },
  { username: 'consultor_dev', email: 'consultor.dev@mcad.local' },
  { username: 'gerente_dev', email: 'gerente.dev@mcad.local' },
  { username: 'gestor_acessosdev', email: 'gestor-acessos.dev@mcad.local' },
  { username: 'operador_dev', email: 'operador.dev@mcad.local' },
  { username: 'tsgomes', email: 'tasso.gomes@tasso.dev.br' },
  { username: 'sem_papel', email: 'sem-papel.dev@mcad.local' },
];

async function request(method, apiPath, body) {
  const response = await fetch(`${baseUrl}/v1${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok && !(method === 'POST' && response.status === 409)) {
    const message = data?.message || data?.code || text || response.statusText;
    throw new Error(`${method} ${apiPath} -> HTTP ${response.status}: ${message}`);
  }
  return { status: response.status, headers: response.headers, data };
}

async function findUserByEmail(email) {
  const result = await request('GET', `/users?q=${encodeURIComponent(email)}&size=50`);
  return result.data?.content?.find((user) => user.email === email) ?? null;
}

async function findRoleByKey(roleKey) {
  const result = await request('GET', `/roles?q=${encodeURIComponent(roleKey)}&size=100`);
  return result.data?.content?.find((role) => role.key === roleKey) ?? null;
}

async function listUserRoles(userId) {
  const result = await request('GET', `/users/${encodeURIComponent(userId)}/roles?includeRemoved=false`);
  return Array.isArray(result.data) ? result.data : [];
}

async function listRolePermissions(roleId) {
  const result = await request('GET', `/roles/${encodeURIComponent(roleId)}/permissions`);
  return Array.isArray(result.data) ? result.data : [];
}

async function listAllRemotePermissions() {
  const permissions = [];
  for (let page = 0; ; page += 1) {
    const result = await request('GET', `/permissions?page=${page}&size=200&status=ACTIVE`);
    const content = result.data?.content ?? [];
    permissions.push(...content);
    if (page + 1 >= (result.data?.totalPages ?? 1)) {
      break;
    }
  }
  return permissions.map((permission) => permission.key).filter(Boolean);
}

async function ensureMasterRole() {
  let role = await findRoleByKey(masterRoleKey);
  if (!role) {
    console.log(`create role ${masterRoleKey}`);
    if (!apply) {
      return { id: 'dry-run-master-role-id', key: masterRoleKey };
    }
    const created = await request('POST', '/roles', {
      key: masterRoleKey,
      displayName: 'Master MCAD QA',
      description: 'Papel temporario de QA com todas as permissoes efetivas enquanto a matriz definitiva e planejada.',
      domain: masterRoleKey.split('.')[0],
      area: masterRoleKey.split('.')[1] || 'default',
    });
    role = created.data;
  } else {
    console.log(`role ${masterRoleKey} already exists`);
  }
  return role;
}

async function ensureMasterPermissions(role) {
  const remoteKeys = await listAllRemotePermissions();
  const permissionKeys = [...new Set(remoteKeys)].sort();
  const current = apply ? await listRolePermissions(role.id) : [];
  const currentKeys = new Set(current.map((permission) => permission.key));
  const missing = permissionKeys.filter((key) => !currentKeys.has(key));

  console.log(`master permissions: target=${permissionKeys.length} missing=${missing.length}`);
  for (const key of missing) {
    console.log(`add permission ${key}`);
    if (apply) {
      await request('POST', `/roles/${encodeURIComponent(role.id)}/permissions`, { permissionKey: key });
    }
  }
  return permissionKeys.length;
}

async function resolveUsers() {
  const resolved = [];
  for (const qaUser of qaUsers) {
    const user = await findUserByEmail(qaUser.email);
    if (!user) {
      console.log(`user not found ${qaUser.email}`);
      continue;
    }
    resolved.push({ ...qaUser, id: user.id });
  }
  return resolved;
}

async function assignMasterToPrimaryUser(users) {
  const assignee = users.find((user) => user.email === masterAssigneeEmail);
  if (!assignee) {
    throw new Error(`Master assignee not found: ${masterAssigneeEmail}`);
  }
  const existing = await listUserRoles(assignee.id);
  if (existing.some((assignment) => assignment.roleKey === masterRoleKey && assignment.status === 'ACTIVE')) {
    console.log(`master already assigned to ${assignee.email}`);
    return assignee;
  }
  console.log(`assign master to ${assignee.email}`);
  if (apply) {
    await request('POST', `/users/${encodeURIComponent(assignee.id)}/roles`, { roleKey: masterRoleKey });
  }
  return assignee;
}

async function removeNonMasterAssignments(users) {
  const roleIdByKey = new Map();
  let removed = 0;
  for (const user of users) {
    const assignments = await listUserRoles(user.id);
    const active = assignments.filter((assignment) => assignment.status === 'ACTIVE' && assignment.roleKey !== masterRoleKey);
    if (active.length === 0) {
      console.log(`clean ${user.email}: no non-master active roles`);
      continue;
    }
    for (const assignment of active) {
      let roleId = roleIdByKey.get(assignment.roleKey);
      if (!roleId) {
        const role = await findRoleByKey(assignment.roleKey);
        if (!role) {
          console.log(`skip ${user.email}: role not found ${assignment.roleKey}`);
          continue;
        }
        roleId = role.id;
        roleIdByKey.set(assignment.roleKey, roleId);
      }
      console.log(`remove ${assignment.roleKey} from ${user.email}`);
      if (apply) {
        const query = assignment.scope?.type
          ? `?scopeType=${encodeURIComponent(assignment.scope.type)}${assignment.scope.id ? `&scopeId=${encodeURIComponent(assignment.scope.id)}` : ''}`
          : '';
        await request('DELETE', `/users/${encodeURIComponent(user.id)}/roles/${encodeURIComponent(roleId)}${query}`);
      }
      removed += 1;
    }
  }
  return removed;
}

async function summarize(users, targetPermissionCount) {
  const rows = [];
  for (const user of users) {
    const effective = await request('GET', `/users/${encodeURIComponent(user.id)}/effective-permissions`);
    rows.push({
      email: user.email,
      roles: effective.data?.roles ?? [],
      permissionCount: effective.data?.permissions?.length ?? 0,
    });
  }
  console.log(JSON.stringify({ apply, masterRoleKey, masterAssigneeEmail, targetPermissionCount, users: rows }, null, 2));
}

async function main() {
  console.log(`mode=${apply ? 'apply' : 'dry-run'} baseUrl=${baseUrl} master=${masterRoleKey} assignee=${masterAssigneeEmail}`);
  const role = await ensureMasterRole();
  const targetPermissionCount = await ensureMasterPermissions(role);
  const users = await resolveUsers();
  await assignMasterToPrimaryUser(users);
  const removed = await removeNonMasterAssignments(users);
  console.log(`non-master assignments ${apply ? 'removed' : 'to remove'}=${removed}`);
  if (apply) {
    await summarize(users, targetPermissionCount);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
