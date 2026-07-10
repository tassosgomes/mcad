import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalApiError, PortalAuthProvider } from './PortalAuthProvider';
import { usePortalAuth } from './usePortalAuth';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <PortalAuthProvider portalApiBaseUrl="https://portal-api.test/api/cadastro/v1/portal">
      {children}
    </PortalAuthProvider>
  );
}

describe('PortalAuthProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('preserves the API conflict status when signup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Já existe uma conta para este CPF/CNPJ' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { result } = renderHook(() => usePortalAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.signup('123.456.789-09', '000.000.00.00', 'Senha@123');
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(PortalApiError);
    expect(thrown).toMatchObject({
      status: 409,
      message: 'Já existe uma conta para este CPF/CNPJ',
    });
  });
});
