/**
 * Cache simples em memoria por sessao (subjectId) para o contexto de
 * autorizacao recebido do ecad-authz. Cada instancia de servidor cria
 * o seu proprio cache (nao e global de modulo), o que evita vazamento
 * entre testes paralelos.
 */
export interface AuthorizationContextPayload {
  user: {
    id: string;
    subject: string;
    email: string;
    name: string;
    userType?: string;
    department?: string | null;
    businessArea?: string | null;
    adminArea?: string | null;
  };
  roles: string[];
  permissions: string[];
  scopes: unknown[];
  menus: unknown[];
  remotes: unknown[];
  version: number;
  expiresInSeconds: number;
}

interface CacheEntry {
  value: AuthorizationContextPayload;
  version: number;
  expiresAt: number;
}

export interface MeCache {
  get(subjectId: string): AuthorizationContextPayload | undefined;
  set(subjectId: string, value: AuthorizationContextPayload, ttlSeconds: number): void;
  invalidate(subjectId: string): void;
  maybeUpdateVersion(subjectId: string, newVersion: number): boolean;
  size(): number;
  clear(): void;
}

export function createMeCache(): MeCache {
  const store = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return Date.now() >= entry.expiresAt;
  }

  return {
    get(subjectId) {
      const entry = store.get(subjectId);

      if (!entry) {
        return undefined;
      }

      if (isExpired(entry)) {
        store.delete(subjectId);
        return undefined;
      }

      return entry.value;
    },

    set(subjectId, value, ttlSeconds) {
      const ttlMs = Math.max(0, ttlSeconds * 1000);
      store.set(subjectId, {
        value,
        version: value.version,
        expiresAt: Date.now() + ttlMs,
      });
    },

    invalidate(subjectId) {
      store.delete(subjectId);
    },

    maybeUpdateVersion(subjectId, newVersion) {
      const entry = store.get(subjectId);

      if (!entry) {
        return false;
      }

      if (newVersion > entry.version) {
        store.delete(subjectId);
        return true;
      }

      return false;
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
