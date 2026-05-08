import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { setDistribuicaoAuthTokenProvider } from '@services/apiDistribuicaoClient';
import { setAuthenticatedFetchUnauthorizedHandler } from '@services/authenticatedFetch';

afterEach(() => {
  cleanup();
  setDistribuicaoAuthTokenProvider(null);
  setAuthenticatedFetchUnauthorizedHandler(null);
  vi.restoreAllMocks();
});
