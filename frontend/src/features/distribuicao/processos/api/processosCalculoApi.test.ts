import { describe, expect, it, vi } from 'vitest';
import { apiPostDist, setDistribuicaoAuthTokenProvider } from '@services/apiDistribuicaoClient';
import { calcularProcesso, consultarCalculoProcesso } from './processosCalculoApi';

function mockJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('processosCalculoApi', () => {
  it('calls POST calcular without body and includes auth headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({
      processoId: 'processo-1',
      status: 'CALCULADO',
    }));
    setDistribuicaoAuthTokenProvider(() => 'token-123');

    await calcularProcesso('processo-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/api/v1/processos/processo-1/calcular',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit.body).toBeUndefined();
    expect(requestInit.headers).toBeInstanceOf(Headers);
    expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer token-123');
    expect((requestInit.headers as Headers).get('Content-Type')).toBeNull();
  });

  it('calls GET calculo with pagination and filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({
      processoId: 'processo-1',
      status: 'CALCULADO',
      resumo: {},
      creditos: { items: [], metadata: { page: 1, size: 10, total: 0, totalPages: 0 } },
    }));
    setDistribuicaoAuthTokenProvider(() => 'token-123');

    await consultarCalculoProcesso('processo-1', {
      page: 1,
      size: 10,
      categoria: 'CONEXO',
      titularId: 'titular-1',
      obraId: 'obra-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/api/v1/processos/processo-1/calculo?page=1&size=10&categoria=CONEXO&titularId=titular-1&obraId=obra-1',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('serializes optional POST bodies through the shared client', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({ ok: true }));

    await apiPostDist('/probe', { value: 'x' });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit.body).toBe(JSON.stringify({ value: 'x' }));
    expect((requestInit.headers as Headers).get('Content-Type')).toBe('application/json');
  });
});
