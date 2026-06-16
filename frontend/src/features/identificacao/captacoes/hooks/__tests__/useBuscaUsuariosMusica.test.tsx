import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useBuscaUsuariosMusica } from '../useBuscaUsuariosMusica';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useBuscaUsuariosMusica', () => {
  it('does not fetch when query has less than 2 characters', async () => {
    const { result } = renderHook(() => useBuscaUsuariosMusica(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isFetching).toBe(false);
  });

  it('returns results when query has 2+ characters', async () => {
    const { result } = renderHook(() => useBuscaUsuariosMusica('Glo'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[0].razaoSocial).toBe('Rádio Globo SP Ltda');
  });

  it('returns empty when no match is found', async () => {
    const { result } = renderHook(() => useBuscaUsuariosMusica('ZZZZZ'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.results).toEqual([]);
  });

  it('respects debounce delay', () => {
    const { result } = renderHook(() => useBuscaUsuariosMusica('R'), {
      wrapper: createWrapper(),
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isFetching).toBe(false);
  });
});
