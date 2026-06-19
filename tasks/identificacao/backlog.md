# Backlog — Domínio Identificação (F02 / F04)

> **Gerado em:** 2026-06-18  
> **Atualizado em:** 2026-06-18  
> **Origem:** auditoria de implementação pós-PRD  
> **PRDs referenciados:** `prd-registro-manual-execucoes/prd.md` (F02), `prd-identificacao-execucoes/prd.md` (F04)

---

## Status geral

A maior parte do código de F02 e F04 foi construída. Os bloqueadores são endpoints ausentes no cadastro-api, uma permissão cruzada faltando na role de analista e a role de consultor inexistente no Keycloak. Há também gaps menores de UX guard no frontend.

---

## Tarefas

### Crítico — bloqueia funcionalidade principal

- [x] **[AUTH-1] Remover mecanismo de catálogo do ecad-authz** ✅ concluído 2026-06-18  
  A raiz da depreciação recorrente: `SelfCatalogRunner` executa no boot e deprecia tudo que não está nos YAMLs. Decisão: remover todo o padrão de auto-registro por catálogo — permissões são gerenciadas direto via API do Authz.  
  **Serviços mcad (arrecadacao + distribuicao): ✅ concluído** — `permissions.yaml`, `PermissionsCatalogStructureTest`, blocos `catalog:` nos `application.yml` e propriedade nos testes de enforcement removidos.  
  **ecad-authz: pendente** — requer acesso ao repo `ecad-authz`. Itens a remover:  
  - Deletar: `SelfCatalogRunner.java`, YAMLs em `resources/permissions/` (authz, mcad-cadastro, mcad-auditoria), `CatalogRegistrar.java` (SDK), `PermissionsYaml.java` (SDK), `CatalogController.java`, `RegisterCatalogUseCase.java` e seus testes  
  - Editar: `AuthzAutoConfiguration.java` (remover bean `catalogRegistrar`), `AuthzProperties.java` (remover inner class `Catalog`), `SecurityConfig.java` (remover `catalogFilterChain` + `audienceAwareDecoder`), `PermissionsController.java` (remover método `registerPermissionCatalog`), `PermissionConfiguration.java` (remover bean `registerCatalogUseCase`), `application.yaml` e `application-prod.yaml` (remover bloco `catalog:`), OpenAPI spec (remover path `/permission-catalog/register` e DTOs associados)

- [x] **[CADASTRO-1] Endpoint POST /api/v1/obras/pendentes no cadastro-api** ✅ concluído 2026-06-18  
  `CriarObraPendenteModal.tsx` chama este endpoint que não existe → 404.  
  **Criar:** endpoint em `ObraEndpoints.cs` + `CriarObraPendenteCommand` + handler.  
  Campos: `titulo` (obrigatório), `tipoObra` (enum, obrigatório). Status: `PENDENTE`.  
  **Implementado:** endpoint dedicado no Cadastro API, contrato principal com `tipoObra`, alias temporário `tipo` para compatibilidade, e select do frontend equiparado aos tipos oficiais (`MUSICAL`, `LITEROMUSICAL`, `VERSAO`, `POT_POURRI`).

- [x] **[CADASTRO-2] Endpoint POST /api/v1/fonogramas/pendentes no cadastro-api** ✅ concluído 2026-06-19  
  `CriarFonogramaPendenteModal.tsx` chama este endpoint que não existe → 404.  
  **Criar:** endpoint em `FonogramaEndpoints.cs` + `CriarFonogramaPendenteCommand` + handler.  
  Campos: `isrc` (obrigatório), `obraId` (obrigatório). Status cadastral inicial: `PENDENTE_VALIDACAO`. Validar que obra existe.
  **Decisão 2026-06-19:** Cadastro é o dono da verdade de fonograma. Como o Cadastro exige ISRC para fonograma, Identificação deve se conformar e solicitar ISRC ao usuário no fluxo inline.
  **Implementado:** endpoint dedicado no Cadastro API, command/handler com validação de ISRC obrigatório, duplicidade e obra existente, modal de Identificação exigindo ISRC e testes unitários do fluxo.

- [ ] **[AUTH-2] Permissão cadastro:default:obra:listar na role identificacao.default.analista**  
  `BuscaCadastroAutocomplete.tsx` chama `GET /api/v1/busca` no cadastro-api, que requer `cadastro:default:obra:listar`. Role `identificacao.default.analista` não inclui essa permissão → 403 em toda busca.  
  **Arquivo:** `seeds/mcad/roles.json` — adicionar `cadastro:default:obra:listar` às roles de analista e consultor de identificação.

---

### Alto — funcionalidade parcialmente bloqueada

- [ ] **[AUTH-3] Criar role consultor-identificacao no Keycloak**  
  Role referenciada nos seeds de mapeamento (`migrate-logto-roles-to-authz-assignments.mjs`) mas nunca criada no `provision-keycloak.sh`. Sem ela nenhum usuário pode ser configurado como Consultor de Identificação.  
  **Arquivo:** `scripts/provision-keycloak.sh`

- [ ] **[F02-1] Habilitar botão "Criar Fonograma" no BuscaCadastroAutocomplete**  
  Botão com `disabled` hardcoded em `captacoes/components/BuscaCadastroAutocomplete.tsx` (~linha 163). O fluxo (`CriarFonogramaPendenteModal`) já existe.  
  **Pré-requisito:** CADASTRO-2 concluído.

---

### Médio — auth guard / UX

- [ ] **[F04-1] Guard de permissão na rota /identificacao/pendentes e no Sidebar**  
  1. `Sidebar.tsx` linha 68: link "Pendentes" sem `requiredPermission` → visível para todos no módulo  
  2. `routes.tsx`: rota `/pendentes` sem `RequirePermission` para `pendente:listar`  
  3. `src/shared/auth/authorizedRoutes.ts`: sem entrada para `pendente:listar` → `/identificacao/pendentes`

---

## Dependências

```
AUTH-1 (correção YAML ecad-authz)  →  resolve depreciação permanente de todas as permissões do Cadastro
AUTH-2 (permissão cruzada)         →  desbloqueia busca no autocomplete (F02)
CADASTRO-1 + CADASTRO-2            →  desbloqueia criação inline de obra/fonograma (F02 RF-03)
CADASTRO-2 + F02-1                 →  habilita criação de fonograma pendente inline
AUTH-3                             →  habilita papel de Consultor de Identificação em produção
```
