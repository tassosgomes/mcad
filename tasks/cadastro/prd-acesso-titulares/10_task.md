---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>cadadro/authorization</domain>
<type>configuration</type>
<scope>middleware</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"11.0", "12.0"</unblocks>
</task_context>

# Tarefa 10.0: Permissões do Analista + Seed (8 chaves)

## Visão Geral

Adicionar as 8 novas chaves de permissão (4-segmentos `cadastro:default:{recurso}:{acao}`) para os endpoints de Analista (triagem de ocorrências e aprovação de solicitações). Estas chaves são usadas pelo `RequireCadastroPermission` nos endpoints e precisam estar sincronizadas entre o código (`CadastroPermissions.cs`) e o seed (`cadastro.permissions.json`) consumido pelo authz-service.

## Requisitos

- PRD — seção *Permissionamento (ecad-authz)*
- Tech Spec — seção *Endpoints de API (Analista)* e *Análise de Impacto*

## Subtarefas

- [ ] 10.1 Adicionar 8 constantes a `1-Services/Cadastro.API/Authorization/CadastroPermissions.cs`:

  | Constante | Valor |
  |---|---|
  | `OcorrenciaListar` | `cadastro:default:ocorrencia:listar` |
  | `OcorrenciaVisualizar` | `cadastro:default:ocorrencia:visualizar` |
  | `OcorrenciaAnalisar` | `cadastro:default:ocorrencia:analisar` |
  | `OcorrenciaResolver` | `cadastro:default:ocorrencia:resolver` |
  | `OcorrenciaCancelar` | `cadastro:default:ocorrencia:cancelar` |
  | `SolicitacaoAlteracaoListar` | `cadastro:default:solicitacao-alteracao:listar` |
  | `SolicitacaoAlteracaoAprovar` | `cadastro:default:solicitacao-alteracao:aprovar` |
  | `SolicitacaoAlteracaoRejeitar` | `cadastro:default:solicitacao-alteracao:rejeitar` |

- [ ] 10.2 Adicionar as 8 entradas correspondentes ao seed `seeds/mcad/cadastro.permissions.json` (schema: `{ key, displayName, description, resource, action }`). Seguir o formato das 48 permissões existentes.
- [ ] 10.3 (Se aplicável) Atualizar `scripts/provision-logto.sh` ou o script de seed authz (`scripts/seed-authz.sh`) para incluir as novas chaves no provisionamento idempotente.
- [ ] 10.4 Validar que `AUTH_ENABLED=false` / `TestAuthHandler` continua funcionando (o `HttpContextCurrentUserPermissions` e o `TestAuthHandler` retornam `Allowed=true` em testes).

## Sequenciamento

- Bloqueado por: Nenhum (são apenas strings de permissão)
- Desbloqueia: 11.0, 12.0 (endpoints de analista usam estas permissões)
- Paralelizável: Sim (independente de domínio/auth do titular; pode correr em paralelo com a Fase 2/3)

## Detalhes de Implementação

As permissões seguem o padrão existente (`CadastroPermissions.cs` é uma `static class` com `public const string`). O seed JSON segue:

```json
{
  "key": "cadastro:default:ocorrencia:listar",
  "displayName": "Listar ocorrências (todas)",
  "description": "Permite listar todas as ocorrências no painel do analista",
  "resource": "ocorrencia",
  "action": "listar"
}
```

**Perfis-base sugeridos** (do PRD): `consultor` e `analista` para listar/visualizar; apenas `analista` para analisar/resolver/cancelar/aprovar/rejeitar.

> **Nota:** as permissões de `anexo:*` existem em `CadastroPermissions.cs` mas ainda não estão no seed JSON (dívida técnica pré-existente). Não resolver isso aqui — escopo é apenas as 8 novas chaves.

## Critérios de Sucesso

- As 8 constantes estão em `CadastroPermissions.cs` com os valores exatos.
- As 8 entradas estão em `cadastro.permissions.json` com `key`, `displayName`, `description`, `resource`, `action`.
- `dotnet build` passa.
- O seed é válido JSON (validar com `python -m json.tool seeds/mcad/cadastro.permissions.json`).
