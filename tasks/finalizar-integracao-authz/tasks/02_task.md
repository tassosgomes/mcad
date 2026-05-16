---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/navegacao</domain>
<type>implementation</type>
<scope>middleware</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 2.0: Frontend — auditar e atualizar `Sidebar`/`routes` para usar `requiredPermissions` (Auditoria + Copiloto)

## Relacionada às User Stories

- US-04 — Checklist T20 do PRD original 100% (cobertura de suporte)
- US-01 — Dev roda testes locais 100% verde (suporte)

## Visão Geral

`relatorio-final.md §3 TODOs no código` lista 4 TODOs:
- `frontend/src/app/router/routes.tsx:25,39` (auditoria e copiloto)
- `frontend/src/shared/components/layout/sidebar/Sidebar.tsx:84,102` (idem)

A definição é: validar com backend qual permissão real protege os módulos "Auditoria" e "Copiloto" e atualizar `requiredPermissions` para refletir essa decisão, removendo o TODO. Em produção, `tsgomes` consegue ver "Auditoria" via `cadastro:default:audit:visualizar` ou similar — confirmar pelo `CadastroPermissions.cs` e seeds.

## Requisitos

- Confirmar com `CadastroPermissions.cs` (e equivalentes) quais permissões protegem cada módulo
- Atualizar `Sidebar.tsx` para passar `requiredPermissions: ['<chave-real>']` em vez do TODO
- Atualizar `routes.tsx` para `<RequirePermission permission="<chave-real>">` na rota correspondente
- Adicionar/atualizar testes em `Sidebar.test.tsx` (se existir) para validar visibilidade condicional
- Remover comentários `TODO` substituídos

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (linhas 84, 102 — TODOs)
  - `mcad/frontend/src/app/router/routes.tsx` (linhas 25, 39 — TODOs)
- **Criar ou modificar:**
  - `mcad/frontend/src/shared/components/layout/sidebar/Sidebar.test.tsx` (se ainda não existir; testar visibilidade por permissão)
- **Referência:**
  - `mcad/services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` — buscar chaves `audit` e equivalentes para copiloto
  - `mcad/services/identificacao-api/1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs` — idem
  - `mcad/seeds/mcad/*.json` — confirmar seed das chaves usadas
  - `mcad/frontend/src/shared/authz/Can.tsx` — uso já existente
  - `mcad/frontend/src/shared/auth/RequirePermission.tsx` — uso em rotas
- **Skills para consultar durante implementação:**
  - `react-testing` — RTL para componentes com Provider; padrão de teste declarativo

## Subtarefas

- [ ] 2.1 Inspecionar `CadastroPermissions.cs` (e `IdentificacaoPermissions.cs`, `arrecadacao-api/permissions.yaml`, `distribuicao-api/permissions.yaml`) para localizar chaves de auditoria
- [ ] 2.2 Identificar se "Copiloto" é gateado por permissão de domínio ou role custom (perguntar/decidir se ainda não claro)
- [ ] 2.3 Substituir TODOs em `Sidebar.tsx` (linhas 84, 102) por `requiredPermissions` reais
- [ ] 2.4 Substituir TODOs em `routes.tsx` (linhas 25, 39) por `<RequirePermission permission="...">`
- [ ] 2.5 Criar/atualizar `Sidebar.test.tsx` cobrindo: usuário com perm → item visível; sem perm → item oculto
- [ ] 2.6 Atualizar `relatorio-final.md §3` removendo os 4 TODOs marcados como resolvidos

## Sequenciamento

- Bloqueado por: Nenhum (mas precisa confirmação rápida da chave de "Copiloto" se ainda não definida)
- Desbloqueia: 8.0 (cenários CT-E2E que validam sidebar)
- Paralelizável: Sim (independente de 1.0; podem rodar em sessões diferentes)

## Rastreabilidade

- Esta tarefa cobre: US-04 + US-01
- Evidência esperada:
  - 0 TODOs nas linhas mencionadas
  - `Sidebar.test.tsx` com cenários positivo + negativo verde
  - Comentário no `relatorio-final.md` atualizando o status

## Detalhes de Implementação

Antes:
```tsx
// Sidebar.tsx:84 (ilustrativo — verificar conteúdo real)
{ label: 'Auditoria', path: '/auditoria', requiredPermissions: [/* TODO: validar com backend */] },
```

Depois (assumindo `cadastro:default:audit:visualizar` é a chave real — confirmar):
```tsx
{ label: 'Auditoria', path: '/auditoria', requiredPermissions: ['cadastro:default:audit:visualizar'] },
```

**Convenções da stack (das skills consultadas):**
- `react-testing`: wrapper de teste com `PermissionsProvider` mockado (`vi.mock('@/shared/authz')` retornando lista controlada)
- `react-code-quality`: union string literal para chaves de permissão se já existir; senão, deixar como string

**Caso "Copiloto" não tenha permissão definida:** abrir uma sub-task de decisão ou usar `cadastro:default:copiloto:utilizar` se aderente ao padrão, documentando no commit.

## Critérios de Sucesso (Verificáveis)

- [ ] grep limpo: `grep -n "TODO" mcad/frontend/src/shared/components/layout/sidebar/Sidebar.tsx mcad/frontend/src/app/router/routes.tsx` retorna 0 linhas (ou apenas TODOs não relacionados a este escopo)
- [ ] Testes passam: `cd mcad/frontend && npm test -- Sidebar routes`
- [ ] Build compila: `cd mcad/frontend && npm run build`
- [ ] Type-check verde: `cd mcad/frontend && npx tsc -b`
- [ ] Sem regressão no total: `npm test` mantém ≥ 51/51
- [ ] `docs/migracao-authz/relatorio-final.md §3` atualizado removendo os 4 TODOs
