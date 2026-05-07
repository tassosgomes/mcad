function removeOidcClientEntries(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key) {
      continue;
    }

    if (key.startsWith('oidc.') || key.startsWith('oidc.user:')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => storage.removeItem(key));
}

export function clearOidcClientState() {
  if (typeof window === 'undefined') {
    return;
  }

  removeOidcClientEntries(window.sessionStorage);
  removeOidcClientEntries(window.localStorage);
}
