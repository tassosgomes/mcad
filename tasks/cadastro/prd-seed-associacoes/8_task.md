---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/setup</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Setup do Projeto React (Vite + TypeScript + Aliases)

## Relacionada às User Stories

- Suporte a todas as HUs — fundação do frontend

## Visão Geral

Criar o projeto React com Vite, TypeScript strict, path aliases (@/, @shared/, @features/), API client, tipos globais e configuração de ambiente. Esta é a fundação para todo o frontend do mini-ECAD.

## Requisitos

- Vite + React 19 + TypeScript strict
- Path aliases configurados em vite.config.ts e tsconfig.json
- API client (fetch wrapper com base URL do .env)
- Tipos globais (ProblemDetails)
- Configuração de ambiente tipada
- Estrutura de pastas intermediária pronta

## Arquivos Envolvidos

- **Criar:**
  - `frontend/package.json`
  - `frontend/vite.config.ts`
  - `frontend/tsconfig.json`
  - `frontend/tsconfig.node.json`
  - `frontend/index.html`
  - `frontend/.env.example`
  - `frontend/.gitignore`
  - `frontend/src/main.tsx` (placeholder)
  - `frontend/src/App.tsx` (placeholder)
  - `frontend/src/shared/services/apiClient.ts`
  - `frontend/src/shared/types/api.ts`
  - `frontend/src/shared/types/index.ts`
  - `frontend/src/shared/config/env.ts`
  - `frontend/src/shared/hooks/useDocumentTitle.ts`
- **Skills para consultar:**
  - `react-architecture` — path aliases, estrutura intermediária, convenções de pastas

## Subtarefas

- [ ] 8.1 Criar projeto: `npm create vite@latest frontend -- --template react-ts`
- [ ] 8.2 Instalar dependências: `react-router`, `@tanstack/react-query`, `lucide-react`
- [ ] 8.3 Configurar path aliases em `vite.config.ts` e `tsconfig.json`
- [ ] 8.4 Criar estrutura de pastas: `src/app/`, `src/shared/`, `src/features/cadastro/`
- [ ] 8.5 Criar `apiClient.ts` — fetch wrapper com base URL
- [ ] 8.6 Criar tipos globais (`ProblemDetails`) e `env.ts`
- [ ] 8.7 Criar `.env.example` com `VITE_API_BASE_URL`
- [ ] 8.8 Verificar: `npm run build`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 9.0
- Paralelizável: Sim — pode executar em paralelo com Lane A inteira

## Detalhes de Implementação

### Path Aliases (vite.config.ts)

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@features': path.resolve(__dirname, './src/features'),
    '@components': path.resolve(__dirname, './src/shared/components'),
    '@hooks': path.resolve(__dirname, './src/shared/hooks'),
    '@services': path.resolve(__dirname, './src/shared/services'),
    '@types': path.resolve(__dirname, './src/shared/types'),
  },
}
```

### API Client

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const problem = await response.json();
    throw problem;
  }
  return response.json();
}
```

### .env.example

```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

**Convenções da stack:**
- Pastas em `kebab-case` (HARD RULE CP-01)
- Arquivos de componente em `PascalCase.tsx` (HARD RULE CP-02)
- Utils e hooks em `camelCase.ts` (HARD RULE CP-03)
- Nunca usar imports relativos `../../../` (HARD RULE PA-01)

## Critérios de Sucesso (Verificáveis)

- [ ] `cd frontend && npm run build` compila sem erros
- [ ] `cd frontend && npm run dev` inicia na porta 5173
- [ ] Path aliases resolvem corretamente (`@shared/services/apiClient`)
- [ ] `.env.example` existe com `VITE_API_BASE_URL`
- [ ] Estrutura de pastas `src/app/`, `src/shared/`, `src/features/` criada
