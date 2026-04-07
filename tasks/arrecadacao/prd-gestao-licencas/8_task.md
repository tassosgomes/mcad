---
status: done
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Types, API Client, API Functions e Hooks

## Relacionada as User Stories
- [HU-01] Criar licenca (cobertura direta — data layer)
- [HU-02] Listar licencas com filtros (cobertura direta — data layer)
- [HU-03] Visualizar detalhe de licenca (cobertura direta — data layer)
- [HU-04] Suspender licenca (cobertura direta — data layer)
- [HU-05] Reativar licenca (cobertura direta — data layer)
- [HU-06] Encerrar licenca (cobertura direta — data layer)

## Visao Geral

Estabelece a camada de dados frontend do modulo de Licencas: novo HTTP client dedicado para arrecadacao-api (porta 5003), interfaces TypeScript derivadas do api-contract, 7 funcoes de chamada HTTP e 7 hooks TanStack Query (3 queries + 4 mutations). Esta tarefa e a fundacao sobre a qual todos os componentes e paginas serao construidos.

## Requisitos

- Criar `apiArrecadacaoClient.ts` seguindo o padrao de `apiIdentificacaoClient.ts`, com env var `VITE_ARRECADACAO_API_BASE_URL`
- Exportar funcoes `apiGetArr<T>()`, `apiPostArr<T>()`, `apiPutArr<T>()`, `apiDeleteArr()` reutilizando `fetchWithAuth` do `apiClient.ts`
- Criar todos os tipos TypeScript: `StatusLicenca`, `Licenca`, `LicencaListResponse`, `CriarLicencaRequest`, `TransicaoStatusRequest`, `HistoricoStatusLicenca`, `LicencaFiltros`, `UsuarioMusicaResumo`, `RubricaResumo`
- Implementar 7 funcoes de API: `getLicencas`, `getLicencaById`, `criarLicenca`, `suspenderLicenca`, `reativarLicenca`, `encerrarLicenca`, `getHistoricoStatusLicenca`
- Implementar 3 hooks query: `useLicencas`, `useLicenca`, `useHistoricoStatusLicenca`
- Implementar 4 hooks mutation: `useCreateLicenca`, `useSuspenderLicenca`, `useReativarLicenca`, `useEncerrarLicenca`
- Mutations invalidam `['licencas']` e `['licencas', id]` (onde aplicavel) no `onSuccess`
- Adicionar `VITE_ARRECADACAO_API_BASE_URL` no `.env` e `.env.example`

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/services/apiArrecadacaoClient.ts`
  - `frontend/src/features/arrecadacao/licencas/types/licenca.ts`
  - `frontend/src/features/arrecadacao/licencas/api/licencasApi.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useLicencas.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useLicenca.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useHistoricoStatusLicenca.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useCreateLicenca.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useSuspenderLicenca.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useReativarLicenca.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useEncerrarLicenca.ts`
- **Modificar:**
  - `frontend/.env` — adicionar `VITE_ARRECADACAO_API_BASE_URL=http://localhost:5003/api/v1`
  - `frontend/.env.example` — adicionar `VITE_ARRECADACAO_API_BASE_URL=http://localhost:5003/api/v1`
- **Referencia:**
  - `frontend/src/shared/services/apiIdentificacaoClient.ts` — padrao para o novo client
  - `frontend/src/shared/services/apiClient.ts` — fetchWithAuth e token provider
  - `frontend/src/features/cadastro/titulares/hooks/` — padrao de hooks TanStack Query
  - `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml` — contrato de request/response

## Subtarefas

- [x] 8.1 Criar `apiArrecadacaoClient.ts` com funcoes `apiGetArr`, `apiPostArr`, `apiPutArr`, `apiDeleteArr`
- [x] 8.2 Adicionar `VITE_ARRECADACAO_API_BASE_URL` em `.env` e `.env.example`
- [x] 8.3 Criar `licenca.ts` com todos os tipos TypeScript
- [x] 8.4 Criar `licencasApi.ts` com as 7 funcoes HTTP
- [x] 8.5 Criar os 3 hooks de query (`useLicencas`, `useLicenca`, `useHistoricoStatusLicenca`)
- [x] 8.6 Criar os 4 hooks de mutation (`useCreateLicenca`, `useSuspenderLicenca`, `useReativarLicenca`, `useEncerrarLicenca`)

## Sequenciamento

- Bloqueado por: 6.0 (backend API layer de licencas disponivel)
- Desbloqueia: 9.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 (camada de dados)
- Evidencia esperada: TypeScript compila sem erros; hooks exportados e consumiveis pelas paginas

## Detalhes de Implementacao

**apiArrecadacaoClient.ts:**

```typescript
// src/shared/services/apiArrecadacaoClient.ts
const BASE_URL = import.meta.env.VITE_ARRECADACAO_API_BASE_URL || 'http://localhost:5003/api/v1';

// Exports: apiGetArr<T>(), apiPostArr<T>(), apiPutArr<T>(), apiDeleteArr()
// Mesma implementacao de fetchWithAuth do apiClient.ts
// Token provider reutilizado do AuthProvider
```

**licenca.ts — tipos completos:**

```typescript
// src/features/arrecadacao/licencas/types/licenca.ts

export type StatusLicenca = 'ATIVA' | 'SUSPENSA' | 'ENCERRADA';

export interface UsuarioMusicaResumo {
  id: string;
  razaoSocial: string;
  cnpjFormatado: string;
}

export interface RubricaResumo {
  id: string;
  sigla: string;
  nome: string;
}

export interface Licenca {
  id: string;
  usuarioMusica: UsuarioMusicaResumo;
  rubrica: RubricaResumo;
  dataInicio: string;       // ISO date "2026-04-01"
  dataFim: string | null;   // null = indefinida
  status: StatusLicenca;
  criadoEm: string;         // ISO datetime
  atualizadoEm: string;
}

export interface LicencaListResponse {
  data: Licenca[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CriarLicencaRequest {
  usuarioMusicaId: string;
  rubricaId: string;
  dataInicio: string;
  dataFim?: string | null;
}

export interface TransicaoStatusRequest {
  justificativa: string;
}

export interface HistoricoStatusLicenca {
  id: string;
  statusAnterior: StatusLicenca | null;
  statusNovo: StatusLicenca;
  justificativa: string;
  autor: string;
  data: string;
}

export interface LicencaFiltros {
  page: number;
  size: number;
  sort: string;
  usuarioMusicaId?: string;
  razaoSocial?: string;
  rubricaSigla?: string;
  status?: StatusLicenca | '';
  vigente?: boolean;
}
```

**licencasApi.ts — assinaturas:**

```typescript
// src/features/arrecadacao/licencas/api/licencasApi.ts
export async function getLicencas(filtros: LicencaFiltros): Promise<LicencaListResponse>
export async function getLicencaById(id: string): Promise<Licenca>
export async function criarLicenca(data: CriarLicencaRequest): Promise<Licenca>
export async function suspenderLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function reativarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function encerrarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function getHistoricoStatusLicenca(id: string): Promise<HistoricoStatusLicenca[]>
```

Query string montada a partir de `LicencaFiltros` omitindo campos undefined/vazios.

**Hooks de query:**

```typescript
// useLicencas.ts
export function useLicencas(filtros: LicencaFiltros) {
  return useQuery({
    queryKey: ['licencas', filtros],
    queryFn: () => getLicencas(filtros),
  });
}

// useLicenca.ts
export function useLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id],
    queryFn: () => getLicencaById(id),
    enabled: !!id,
  });
}

// useHistoricoStatusLicenca.ts
export function useHistoricoStatusLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id, 'historico-status'],
    queryFn: () => getHistoricoStatusLicenca(id),
    enabled: !!id,
  });
}
```

**Hooks de mutation (padrao comum):**

```typescript
// useCreateLicenca.ts
export function useCreateLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarLicenca,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
    },
  });
}

// useSuspenderLicenca.ts, useReativarLicenca.ts, useEncerrarLicenca.ts
// mutationFn recebe { id, data: TransicaoStatusRequest }
// onSuccess invalida ['licencas'] e ['licencas', id]
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
