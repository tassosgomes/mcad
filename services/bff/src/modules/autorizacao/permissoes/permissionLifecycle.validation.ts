import {
  asRecord,
  getString,
  type CreatePermissionInput,
} from './permissionLifecycle.mapper.js';

export const VIEW_PERMISSION = 'authz:admin:permission:visualizar';
export const DEPRECATE_PERMISSION = 'authz:admin:permission:depreciar';
export const CREATE_PERMISSION = 'authz:admin:permission:criar';
export const REACTIVATE_PERMISSION = 'authz:admin:permission:reativar';
export const REMOVE_PERMISSION = 'authz:admin:permission:remover';
export const CONFIRMATION_TEXT = 'CONFIRMO';

const PERMISSION_KEY_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/;

export function parseCreatePermissionInput(body: unknown): CreatePermissionInput | undefined {
  const record = asRecord(body);
  if (!record) return undefined;

  const key = getString(record.key)?.trim();
  const displayName = getString(record.displayName)?.trim();
  const domain = getString(record.domain)?.trim();
  const area = getString(record.area)?.trim();
  const resource = getString(record.resource)?.trim();
  const action = getString(record.action)?.trim();

  if (!key || !displayName || !domain || !area || !resource || !action) {
    return undefined;
  }

  return {
    key,
    displayName,
    description: record.description == null ? null : getString(record.description)?.trim() ?? null,
    domain,
    area,
    resource,
    action,
  };
}

export function validatePermissionInput(input: CreatePermissionInput): string[] {
  const errors: string[] = [];
  const expectedKey = `${input.domain}:${input.area}:${input.resource}:${input.action}`;

  if (!PERMISSION_KEY_PATTERN.test(input.key)) {
    errors.push('key must match dominio:area:recurso:acao using lowercase letters, numbers and hyphens');
  }

  if (input.key !== expectedKey) {
    errors.push('key must match domain, area, resource and action segments');
  }

  return errors;
}
