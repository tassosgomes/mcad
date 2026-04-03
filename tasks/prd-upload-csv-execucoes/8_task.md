---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"9.0, 10.0"</unblocks>
</task_context>

# Tarefa 8.0: Frontend — Types, API Client e Hooks

## Visão Geral

Criar tipos TypeScript, funções de API (incluindo upload multipart) e 4 hooks React Query com suporte a polling para status de processamento.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/types/upload.ts`
  - `frontend/src/features/identificacao/captacoes/api/uploadsApi.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useUploads.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useUpload.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useUploadCsv.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useErrosUpload.ts`
- **Referência:**
  - `frontend/src/shared/services/apiIdentificacaoClient.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useExecucoes.ts` (padrão de hook)
  - `tasks/prd-upload-csv-execucoes/api-contract.yaml`

## Subtarefas

- [x] 8.1 Criar `upload.ts` com interfaces (Upload, ErroUpload, StatusUpload, responses)
- [x] 8.2 Criar `uploadsApi.ts` — getUploads, getUploadById, getErrosUpload, uploadCsv (fetch multipart direto, não apiPost)
- [x] 8.3 Criar `useUploads` — lista paginada
- [x] 8.4 Criar `useUpload` — polling via `refetchInterval: 5000` enquanto PROCESSANDO, invalidação cruzada ao concluir (execucoes + captacoes)
- [x] 8.5 Criar `useUploadCsv` — mutation com File, invalidate uploads on success
- [x] 8.6 Criar `useErrosUpload` — paginado, enabled quando uploadId definido

## Sequenciamento

- Bloqueado por: Nenhum (depende apenas do api-contract)
- Desbloqueia: 9.0, 10.0
- Paralelizável: Sim

## Detalhes de Implementação

**uploadCsv — multipart (não usa apiPost):**
```typescript
export async function uploadCsv(captacaoId: string, arquivo: File): Promise<Upload> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const BASE_URL = import.meta.env.VITE_IDENTIFICACAO_API_BASE_URL || 'http://localhost:5100/api/v1';
  const token = getAuthToken?.();
  const response = await fetch(`${BASE_URL}/captacoes/${captacaoId}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,  // NÃO definir Content-Type — browser gera boundary
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({ detail: 'Erro ao fazer upload' }));
    throw problem;
  }
  return response.json();
}
```

**useUpload — polling + invalidação:**
```typescript
export function useUpload(captacaoId: string, uploadId: string | null) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);

  return useQuery({
    queryKey: ['uploads', captacaoId, uploadId],
    queryFn: () => getUploadById(captacaoId, uploadId!),
    enabled: !!uploadId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      // Quando transitar de PROCESSANDO → outro status, invalidar caches
      if (previousStatusRef.current === 'PROCESSANDO' && data.status !== 'PROCESSANDO') {
        queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
        queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
        queryClient.invalidateQueries({ queryKey: ['uploads', captacaoId] });
      }
      previousStatusRef.current = data.status;

      return data.status === 'PROCESSANDO' ? 5000 : false;
    },
  });
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] `uploadCsv` envia multipart/form-data (não JSON)
- [ ] `useUpload` faz polling a cada 5s enquanto PROCESSANDO
- [ ] Invalidação cruzada funciona (execucoes + captacoes + uploads)
