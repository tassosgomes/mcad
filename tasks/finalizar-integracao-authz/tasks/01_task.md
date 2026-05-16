---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/autorizacao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 1.0: Frontend — refactor ProcessoCalculoPage (`hasRole` → `can`) e remoção do `hasRole` deprecated

## Relacionada às User Stories

- US-04 — Checklist T20 do PRD original 100% (cobertura direta — item "Nenhum componente usa hasRole como autorização de negócio")

## Visão Geral

Último resíduo do `hasRole` em arquivo de produção. `ProcessoCalculoPage.tsx:49,67` ainda usa `hasRole('analista-distribuicao')` com TODO Fase F que pode ser fechado agora (o serviço `distribuicao-api` foi criado em F02 e tem `distribuicao.default.analista`). Após o refactor, `hasRole` pode ser removido de `AuthProvider`/`AuthContext`.

## Requisitos

- Substituir `hasRole('analista-distribuicao')` por `can('distribuicao:default:processo:calcular')` em `ProcessoCalculoPage.tsx`
- Atualizar `ProcessoCalculoPage.test.tsx` para mockar `usePermissions` em vez de `useAuth.hasRole`
- Remover `hasRole` de `AuthProvider.tsx` (linhas 120, 175) e da interface `AuthContext.tsx:14`
- Atualizar `CopilotoPage.test.tsx` que ainda mocka `hasRole` (apenas para teste)
- Validar que `grep -rn "hasRole" mcad/frontend/src` retorna apenas ocorrências em arquivos `*.test.tsx` (mocks justificados)

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` (linhas 49, 52, 67 — TODO Fase F)
  - `mcad/frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.test.tsx` (mock useAuth → mock usePermissions)
  - `mcad/frontend/src/shared/auth/AuthProvider.tsx` (linhas 120, 175 — remover `hasRole`)
  - `mcad/frontend/src/shared/auth/AuthContext.tsx` (linha 14 — remover da interface)
  - `mcad/frontend/src/features/copiloto/pages/CopilotoPage.test.tsx` (linha 21 — adaptar para usePermissions)
  - `mcad/frontend/src/shared/authz/__tests__/usePermissions.test.tsx` (linha 15 — possível ajuste se mock comum)
- **Referência:**
  - `mcad/frontend/src/shared/authz/usePermissions.ts` — hook `can(perm)`
  - `mcad/frontend/src/shared/authz/Can.tsx` — pode ser usado para gating declarativo
  - `mcad/seeds/mcad/distribuicao.permissions.json` (se existir) — confirmar que `distribuicao:default:processo:calcular` está seedado
- **Skills para consultar durante implementação:**
  - `react-testing` — padrão de mock para hooks (vi.mock)
  - `react-code-quality` — TS estrito, sem `any`

## Subtarefas

- [ ] 1.1 Refactor `ProcessoCalculoPage.tsx` substituindo `useAuth().hasRole(...)` por `usePermissions().can(...)`
- [ ] 1.2 Adaptar `ProcessoCalculoPage.test.tsx`: mockar `usePermissions` retornando `{ can: (k) => k === 'distribuicao:default:processo:calcular' }` para cenário positivo; `() => false` para negativo
- [ ] 1.3 Remover `hasRole` de `AuthProvider.tsx` (member + valor exposto no Provider)
- [ ] 1.4 Remover `hasRole` da interface em `AuthContext.tsx`
- [ ] 1.5 Atualizar `CopilotoPage.test.tsx` que mocka `hasRole` (substituir mock por `usePermissions`)
- [ ] 1.6 Rodar grep final: deve restar apenas em `frontend/src/shared/authz/__tests__/usePermissions.test.tsx` (mock-passthrough válido)
- [ ] 1.7 Adicionar entrada no CHANGELOG do frontend ou nota no `docs/migracao-authz/relatorio-final.md`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0 (CT-E2E-06 valida o caminho refatorado)
- Paralelizável: Sim (independente da Lane Backend)

## Rastreabilidade

- Esta tarefa cobre: US-04
- Evidência esperada:
  - `npm test -- ProcessoCalculoPage CopilotoPage AuthProvider AuthContext` verde
  - `grep -rn "hasRole" mcad/frontend/src --include="*.tsx" --include="*.ts" | grep -v "__tests__\|\.test\."` retorna 0 linhas
  - `npm run type-check` sem erros

## Detalhes de Implementação

Antes:
```tsx
// ProcessoCalculoPage.tsx:49-67 (estado atual — verificado por grep)
// TODO Fase F: substituir hasRole('analista-distribuicao') por can('distribuicao:default:processo:calcular')
const { hasRole } = useAuth();
// ...
const isAnalyst = hasRole('analista-distribuicao');
```

Depois (alvo):
```tsx
import { usePermissions } from '@/shared/authz';
// ...
const { can } = usePermissions();
const isAnalyst = can('distribuicao:default:processo:calcular');
```

**Convenções da stack (das skills consultadas):**
- `react-testing`: usar `vi.mock('@/shared/authz', () => ({ usePermissions: () => ({ can: (k: string) => k === '...' }) }))` em vez de `vi.mock('@/shared/auth')`
- `react-code-quality`: manter `import type` quando o mock só precisa do tipo; sem `any`

**Confirmação de permissão no catálogo:**
Antes de codar, validar via `cat mcad/services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml | grep processo:calcular`. Se a chave for diferente (ex.: `distribuicao:default:processo-calculo:executar`), usar a chave real do catálogo.

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/frontend && npm test -- ProcessoCalculoPage`
- [ ] Testes passam: `cd mcad/frontend && npm test -- CopilotoPage`
- [ ] Build compila sem erros: `cd mcad/frontend && npm run build`
- [ ] Type-check verde: `cd mcad/frontend && npx tsc -b`
- [ ] grep limpo: `grep -rn "hasRole" mcad/frontend/src --include="*.tsx" --include="*.ts" | grep -v "__tests__\|\.test\." | wc -l` retorna `0`
- [ ] Sem regressão no total: `cd mcad/frontend && npm test` mantém ≥ 51/51 + os novos para o cenário negativo de `can()`
