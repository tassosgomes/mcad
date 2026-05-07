import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { setDistribuicaoAuthTokenProvider } from '@services/apiDistribuicaoClient';

afterEach(() => {
  cleanup();
  setDistribuicaoAuthTokenProvider(null);
  vi.restoreAllMocks();
});
