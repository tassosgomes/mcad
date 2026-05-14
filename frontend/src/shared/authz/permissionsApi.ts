import { PermissionsUnauthorizedError, type PermissionsResponse } from './types';

/**
 * BFF endpoint that returns the effective permission set for the current
 * authenticated subject. The BFF is mounted at `/api/*` and consumes the
 * Bearer token, calling `ecad-authz` upstream.
 */
const PERMISSIONS_PATH = '/api/me/permissions';

export interface FetchPermissionsOptions {
  token: string;
  signal?: AbortSignal;
  /** Override for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

export interface FetchPermissionsResult {
  data: PermissionsResponse;
  /** Value of the `X-Authz-Version` header, if present. */
  authzVersionHeader: string | null;
}

async function parseUnauthorized(response: Response): Promise<PermissionsUnauthorizedError> {
  let code: string | undefined;
  let message: string | undefined;

  try {
    const body = (await response.json()) as { code?: unknown; message?: unknown };
    if (typeof body?.code === 'string') {
      code = body.code;
    }
    if (typeof body?.message === 'string') {
      message = body.message;
    }
  } catch {
    // Body might be empty or not JSON — keep defaults.
  }

  return new PermissionsUnauthorizedError(response.status, code, message);
}

function assertPermissionsResponse(value: unknown): asserts value is PermissionsResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('Permissions response is not an object');
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.subjectId !== 'string') {
    throw new Error('Permissions response is missing `subjectId`');
  }

  if (!Array.isArray(candidate.permissions)) {
    throw new Error('Permissions response is missing `permissions`');
  }

  const allStrings = candidate.permissions.every((entry) => typeof entry === 'string');
  if (!allStrings) {
    throw new Error('Permissions response contains non-string permission entries');
  }

  if (typeof candidate.version !== 'number') {
    throw new Error('Permissions response is missing `version`');
  }
}

export async function fetchPermissions(
  options: FetchPermissionsOptions,
): Promise<FetchPermissionsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(PERMISSIONS_PATH, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: 'application/json',
    },
    signal: options.signal,
  });

  if (response.status === 401) {
    throw await parseUnauthorized(response);
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = null;
    }
    const error = new Error(
      `Failed to fetch permissions (HTTP ${response.status})`,
    ) as Error & { status: number; detail: unknown };
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  const payload: unknown = await response.json();
  assertPermissionsResponse(payload);

  return {
    data: payload,
    authzVersionHeader: response.headers.get('X-Authz-Version'),
  };
}

export const PERMISSIONS_API_PATH = PERMISSIONS_PATH;
