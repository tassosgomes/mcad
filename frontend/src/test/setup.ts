import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setBffAuthTokenProvider } from '@services/apiBffClient';
import { setDistribuicaoAuthTokenProvider } from '@services/apiDistribuicaoClient';
import { setAuthenticatedFetchUnauthorizedHandler } from '@services/authenticatedFetch';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  setBffAuthTokenProvider(null);
  setDistribuicaoAuthTokenProvider(null);
  setAuthenticatedFetchUnauthorizedHandler(null);
  vi.restoreAllMocks();
});
afterAll(() => server.close());
