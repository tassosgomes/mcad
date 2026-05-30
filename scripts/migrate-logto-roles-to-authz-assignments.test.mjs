import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applyAssignments,
  buildMigrationPlan,
  createRoleCatalog,
  mergeApplyResults,
  parseEnvQaUsers,
} from './migrate-logto-roles-to-authz-assignments.mjs';

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const catalog = createRoleCatalog(await loadJson('seeds/mcad/roles.json'));

test('plans known legacy Logto role as official ecad-authz assignment', async () => {
  const fixture = await loadJson('tests/fixtures/migrate-logto-roles-to-authz-assignments/known-role.json');
  const plan = buildMigrationPlan({
    logtoUsers: fixture.users,
    catalog,
    validationUsers: [{ hint: 'analista-cadastro', email: 'analista.cadastro@mcad.local' }],
  });

  assert.equal(plan.usersScanned, 1);
  assert.equal(plan.rolesRecognized, 1);
  assert.equal(plan.rolesUnmapped.length, 0);
  assert.equal(plan.assignmentsPlanned.length, 1);
  assert.equal(plan.assignmentsPlanned[0].roleKey, 'cadastro.default.analista');
  assert.equal(plan.blockingFindings.length, 0);
});

test('blocks unknown Logto role instead of migrating silently', async () => {
  const fixture = await loadJson('tests/fixtures/migrate-logto-roles-to-authz-assignments/unknown-role.json');
  const plan = buildMigrationPlan({
    logtoUsers: fixture.users,
    catalog,
    validationUsers: [],
  });

  assert.equal(plan.assignmentsPlanned.length, 0);
  assert.equal(plan.rolesUnmapped.length, 1);
  assert.equal(plan.rolesUnmapped[0].roleName, 'legacy-sem-mapeamento');
  assert.equal(plan.blockingFindings[0].code, 'UNMAPPED_LOGTO_ROLE');
});

test('treats ecad-authz 409 assignment response as idempotent success', async () => {
  const fixture = await loadJson('tests/fixtures/migrate-logto-roles-to-authz-assignments/duplicate-assignment.json');
  const plan = buildMigrationPlan({
    logtoUsers: fixture.users,
    catalog,
    validationUsers: [],
  });
  const calls = [];
  const authzClient = {
    async resolveUser(assignment) {
      calls.push({ type: 'resolveUser', assignment });
      return { id: 'authz-user-duplicate' };
    },
    async assignRole(input) {
      calls.push({ type: 'assignRole', input });
      return { status: 409, body: { code: 'USER_ROLE_ASSIGNMENT_ALREADY_EXISTS' } };
    },
  };

  const applyResults = await applyAssignments({
    authzClient,
    assignments: plan.assignmentsPlanned,
    correlationId: 'test-correlation',
  });
  const result = mergeApplyResults(plan, applyResults);

  assert.equal(plan.assignmentsPlanned[0].roleKey, 'distribuicao.default.gerente');
  assert.equal(applyResults[0].outcome, 'already-existing');
  assert.equal(result.assignmentsAlreadyExisting.length, 1);
  assert.equal(result.assignmentsFailed.length, 0);
  assert.equal(calls.find((call) => call.type === 'assignRole').input.correlationId, 'test-correlation');
});

test('parses .env_qa users without retaining passwords', () => {
  const users = parseEnvQaUsers(`
Hint: consultor.dev
Endereco de e-mail: consultor.dev@mcad.local
Nome de usuario: consultor_dev
Senha: should-not-appear
---
Hint: operador.dev
Endereco de e-mail: operador.dev@mcad.local
Nome de usuario: operador_dev
Nova senha: should-not-appear-either
`);

  assert.deepEqual(users, [
    {
      hint: 'consultor.dev',
      email: 'consultor.dev@mcad.local',
      username: 'consultor_dev',
    },
    {
      hint: 'operador.dev',
      email: 'operador.dev@mcad.local',
      username: 'operador_dev',
    },
  ]);
  assert.equal(JSON.stringify(users).includes('should-not-appear'), false);
});

