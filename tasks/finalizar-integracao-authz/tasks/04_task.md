---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/identificacao-api</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database,http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 4.0: Identificacao API (.NET) — ampliar `AuthEndpointsTests.cs` cobrindo CT-IDF-R01..R07

## Relacionada às User Stories

- US-01, US-03 — cobertura direta

## Visão Geral

Mesmo padrão da Task 3.0 aplicado ao Identificacao: matriz 3 estados × endpoints principais (Captacoes, Execucoes, Uploads, Pendentes, Cancelamentos, Rubricas, TipoUtilizacao, Fechamento) + CT-IDF-R07 (catalog registration com 20 chaves `identificacao:default:*`).

## Requisitos

- 8 endpoints × 3 estados (alguns já cobertos pelos 11 atuais)
- Catalog registration de 20 chaves
- Assert sobre `ErrorResponse` no 403

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/services/identificacao-api/5-Tests/Identificacao.IntegrationTests/AuthEndpointsTests.cs`
- **Criar (se ausentes):**
  - `mcad/services/identificacao-api/5-Tests/Identificacao.IntegrationTests/MockEcadAuthzServer.cs` (helper)
  - `mcad/services/identificacao-api/5-Tests/Identificacao.IntegrationTests/CatalogRegistrationTests.cs`
- **Referência:**
  - `mcad/services/identificacao-api/1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs`
  - `mcad/services/identificacao-api/1-Services/Identificacao.API/Endpoints/{Captacao,Execucao,Upload,Pendente,Cancelamento,Rubrica,TipoUtilizacao,Fechamento}Endpoints.cs`
  - `mcad/docs/authz/catalog/identificacao.md`
- **Skills para consultar durante implementação:**
  - `csharp-testing`, `csharp-code-quality`, `common-restful-api`

## Subtarefas

- [ ] 4.1 Mapear endpoints já cobertos (11 testes atuais) vs faltantes
- [ ] 4.2 Adicionar `MockEcadAuthzServer` (reuso possível com Cadastro via lib compartilhada — avaliar)
- [ ] 4.3 Implementar matriz 3×8 cobrindo casos faltantes (captacao:listar/criar/editar/excluir, execucao:*, upload:importar/listar/visualizar/visualizar-erros, pendente:listar/visualizar-impacto/resolver, cancelamento:*, etc.)
- [ ] 4.4 Implementar CT-IDF-R07 (catalog registration ≥ 20 chaves)
- [ ] 4.5 Atualizar `relatorio-final.md §5` com novo total

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0
- Paralelizável: Sim

## Rastreabilidade

- Cobre: US-01, US-03
- Evidência: `dotnet test 5-Tests/Identificacao.IntegrationTests` ≥ 11 + novos

## Detalhes de Implementação

Reaproveitar 100% do padrão da Task 3.0. A diferença é apenas o conjunto de endpoints e chaves de permissão. Se `MockEcadAuthzServer` puder ser extraído para um pacote `5-Tests/Mcad.Test.Common` (no futuro), registrar no commit como melhoria possível.

**Cuidado especial — Logto subject:** A nota do `analise-estado-atual.md` lembra que **Identificacao foi ajustada por MD5 do `sub` opaco do Logto**. Os JWTs de teste devem refletir esse formato para não regredir esse caminho.

**Convenções da stack:**
- Mesmas da Task 3.0
- `Theory` com `MemberData` para tabular os 8 endpoints

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/services/identificacao-api && dotnet test 5-Tests/Identificacao.IntegrationTests --filter "FullyQualifiedName~AuthEndpointsTests|FullyQualifiedName~CatalogRegistrationTests"`
- [ ] Build: `cd mcad/services/identificacao-api && dotnet build Identificacao.slnx`
- [ ] Total geral mantém-se verde: `dotnet test` ≥ 123 + 11 + novos
- [ ] Format: `dotnet format --verify-no-changes`
