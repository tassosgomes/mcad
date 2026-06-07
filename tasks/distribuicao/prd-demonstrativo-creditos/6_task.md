---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>frontend/distribuicao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — tipos TypeScript + API client + hooks TanStack Query

## Visao Geral

Cria a camada de dados do frontend para F07: tipos TypeScript alinhados aos DTOs do backend, funcoes de API client e hooks TanStack Query. Pode ser desenvolvida assim que os DTOs (Task 2.0) estiverem definidos, sem aguardar o backend estar rodando.

## Requisitos

- Tipos TypeScript espelhando `TitularesDemonstrativoPageResponse` e `DemonstrativoTitularResponse`
- Funcoes de API client usando o padrao existente em `features/distribuicao/processos/api/`
- Hook `useListarTitularesDemonstrativo(processoId, params)` com suporte a filtro e paginacao
- Hook `useConsultarDemonstrativoTitular(processoId, titularId)` com `enabled` condicional
- Integrar com o cliente HTTP e handler de autenticacao ja existentes no projeto

## Subtarefas

- [ ] 6.1 Criar tipos em `frontend/src/features/distribuicao/demonstrativos/types/index.ts`
  - `TitularDemonstrativoResumo`
  - `TitularesDemonstrativoPage`
  - `ResumoFinanceiro`
  - `CreditoCalculado`, `CreditoRetido`, `CreditoLiberado`
  - `DemonstrativoTitular`
  - `ListarTitularesParams` (titularNome, page, size, sort)
- [ ] 6.2 Criar funcoes API em `frontend/src/features/distribuicao/demonstrativos/api/demonstrativosApi.ts`
  - `listarTitularesDemonstrativo(processoId, params)`
  - `consultarDemonstrativoTitular(processoId, titularId)`
- [ ] 6.3 Criar hooks em `frontend/src/features/distribuicao/demonstrativos/hooks/useDemonstrativos.ts`
  - `useListarTitularesDemonstrativo(processoId, params)`
  - `useConsultarDemonstrativoTitular(processoId, titularId, options?)`
- [ ] 6.4 Criar `frontend/src/features/distribuicao/demonstrativos/index.ts` com exports publicos

## Sequenciamento

- Bloqueado por: 2.0 (para alinhar tipos com os DTOs)
- Desbloqueia: 7.0
- Paralelizavel: Sim (pode rodar em paralelo com Tasks 3.0, 4.0, 5.0)

## Detalhes de Implementacao

### Estrutura de diretorios

```
frontend/src/features/distribuicao/demonstrativos/
  types/
    index.ts
  api/
    demonstrativosApi.ts
  hooks/
    useDemonstrativos.ts
  index.ts
```

### Tipos TypeScript — referencia

```typescript
// types/index.ts

export interface TitularDemonstrativoResumo {
  titularId: string;
  titularNome: string;
  totalCalculado: string;
  totalRetido: string;
  totalLiberado: string;
  totalAReceber: string;
  quantidadeObras: number;
}

export interface TitularesDemonstrativoPage {
  items: TitularDemonstrativoResumo[];
  metadata: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface ResumoFinanceiro {
  totalAReceber: string;
  totalCalculado: string;
  totalRetido: string;
  totalLiberado: string;
  totalAjustesEstorno: string;
}

export interface CreditoCalculado {
  obraId: string;
  obraNome: string;
  fonogramaId: string;
  fonogramaNome: string;
  categoria: string;
  subcategoria: string;
  percentual: string;
  valorObra: string;
  valorCredito: string;
}

export interface CreditoRetido {
  obraId: string;
  obraNome: string;
  fonogramaId: string;
  fonogramaNome: string;
  categoria: string;
  motivoRetencao: string;
  valorCredito: string;
  retidoEm: string;
}

export interface CreditoLiberado {
  obraId: string;
  obraNome: string;
  fonogramaId: string;
  fonogramaNome: string;
  categoria: string;
  processoOrigemId: string;
  motivoOriginal: string;
  valorCredito: string;
  liberadoEm: string;
}

export interface DemonstrativoTitular {
  processoId: string;
  statusProcesso: string;
  rubricaSigla: string;
  periodo: string;
  titularId: string;
  titularNome: string;
  resumo: ResumoFinanceiro;
  creditosPeriodo: CreditoCalculado[];
  creditosRetidos: CreditoRetido[];
  creditosLiberados: CreditoLiberado[];
  ajustesEstorno: unknown[];
  totalAjustesEstorno: string;
}

export interface ListarTitularesParams {
  titularNome?: string;
  page?: number;
  size?: number;
  sort?: 'nome' | 'totalAReceber';
}
```

### API client — padrao do projeto

Verificar como `features/distribuicao/processos/api/` faz as chamadas (axios ou fetch com interceptors). Seguir o mesmo padrao. Exemplo generico:

```typescript
// api/demonstrativosApi.ts
export const listarTitularesDemonstrativo = async (
  processoId: string,
  params?: ListarTitularesParams
): Promise<TitularesDemonstrativoPage> => {
  const response = await apiClient.get(
    `/api/v1/processos/${processoId}/demonstrativos`,
    { params }
  );
  return response.data;
};

export const consultarDemonstrativoTitular = async (
  processoId: string,
  titularId: string
): Promise<DemonstrativoTitular> => {
  const response = await apiClient.get(
    `/api/v1/processos/${processoId}/demonstrativos/${titularId}`
  );
  return response.data;
};
```

### Hooks TanStack Query

```typescript
// hooks/useDemonstrativos.ts
export const useListarTitularesDemonstrativo = (
  processoId: string,
  params?: ListarTitularesParams
) => {
  return useQuery({
    queryKey: ['demonstrativos', 'titulares', processoId, params],
    queryFn: () => listarTitularesDemonstrativo(processoId, params),
    enabled: !!processoId,
  });
};

export const useConsultarDemonstrativoTitular = (
  processoId: string,
  titularId: string | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['demonstrativos', 'titular', processoId, titularId],
    queryFn: () => consultarDemonstrativoTitular(processoId, titularId!),
    enabled: !!processoId && !!titularId && (options?.enabled ?? true),
  });
};
```

## Criterios de Sucesso

- `npm run build` no frontend compila sem erros de tipo
- Tipos TypeScript alinham com os campos dos DTOs Java (nomes e tipos)
- Hook `useConsultarDemonstrativoTitular` nao dispara request quando `titularId` e null
- Cache key de `useListarTitularesDemonstrativo` inclui os params (mudanca de filtro invalida cache)
