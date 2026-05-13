import type { RuntimeContext } from '@mastra/core/runtime-context';
import type { AiOrchestratorConfig } from '../../config/env.js';
import { assertPermission } from '../../http/auth-context.js';
import { mcadGet } from '../../http/mcad-client.js';
import type { McadRuntimeContext } from '../../schemas/runtime-context.js';
import type { LookupItem } from './tool-results.js';

export interface ToolFactoryContext {
  config: AiOrchestratorConfig;
}

export interface ToolHttpRequest {
  baseUrl: string;
  path: string;
  runtimeContext: RuntimeContext;
  searchParams?: Record<string, string | number | boolean | undefined>;
  abortSignal?: AbortSignal;
}

interface CollectionResponse {
  items?: unknown[];
  data?: unknown[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

export function toLookupItems(payload: unknown, labelKeys: string[], statusKeys: string[] = ['status']): LookupItem[] {
  const collection = asRecord(payload) as CollectionResponse;
  const values = Array.isArray(payload)
    ? payload
    : Array.isArray(collection.items)
      ? collection.items
      : Array.isArray(collection.data)
        ? collection.data
        : [payload];

  return values.map((value, index) => {
    const record = asRecord(value);
    const id = getStringValue(record, ['id', 'codigo', 'iswc', 'isrc']) ?? String(index + 1);
    const label = getStringValue(record, labelKeys) ?? id;
    const status = getStringValue(record, statusKeys);

    return {
      id,
      label,
      status,
      metadata: record,
    };
  });
}

export async function getToolJson<TResponse>(request: ToolHttpRequest): Promise<TResponse> {
  const runtimeContext = request.runtimeContext as McadRuntimeContext;

  return mcadGet<TResponse>({
    baseUrl: request.baseUrl,
    path: request.path,
    accessToken: runtimeContext.get('accessToken'),
    requestId: runtimeContext.get('requestId'),
    searchParams: request.searchParams,
    abortSignal: request.abortSignal,
    timeoutMs: 10000,
  });
}

export function requireToolPermission(runtimeContext: RuntimeContext, permission: string): void {
  assertPermission(runtimeContext as McadRuntimeContext, permission);
}
