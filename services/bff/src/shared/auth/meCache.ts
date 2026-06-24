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
      const entry = {
        value,
        version: value.version,
        expiresAt: Date.now() + ttlMs,
      };

      store.set(subjectId, entry);
      store.set(value.user.subject, entry);
      store.set(value.user.id, entry);
    },

    invalidate(subjectId) {
      const entry = store.get(subjectId);

      if (!entry) {
        store.delete(subjectId);
        return;
      }

      for (const [key, value] of store.entries()) {
        if (value === entry) {
          store.delete(key);
        }
      }
    },

    maybeUpdateVersion(subjectId, newVersion) {
      const entry = store.get(subjectId);

      if (!entry) {
        return false;
      }

      if (newVersion > entry.version) {
        for (const [key, value] of store.entries()) {
          if (value === entry) {
            store.delete(key);
          }
        }
        return true;
      }

      return false;
    },

    size() {
      return new Set(store.values()).size;
    },

    clear() {
      store.clear();
    },
  };
}
