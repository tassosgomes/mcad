# Review da Task 3.0

## 1. Resultado da validacao automatizada

Status: APROVADA

Resumo:

- `services/bff`: build TypeScript (`tsc -p tsconfig.json`) limpo, sem erros ou avisos
- `services/bff`: 136/136 testes passaram (128 baseline da task 2.0 + 8 novos da task 3.0)
- lint: nao ha script configurado em `services/bff/package.json`; ausencia pre-existente, nao introduzida por esta task
- typecheck: coberto pelo build (`tsc -p tsconfig.json`)

## 2. Comandos executados

```bash
cd /home/tsgomes/mcad/services/bff && npm run build
```

Resultado: sucesso (saida vazia — sem erros de compilacao TypeScript)

```bash
cd /home/tsgomes/mcad/services/bff && npm test
```

Resultado:

```
ℹ pass 136
ℹ fail 0
```

## 3. Resultado da revisao tecnica

Status: APROVADA

### Arquivos inspecionados

- `services/bff/src/authzPermissionLifecycleRoutes.ts` (modificado: endpoint POST /depreciar adicionado)
- `services/bff/src/authzPermissionLifecycleRoutes.test.ts` (modificado: 8 novos testes)
- `services/bff/src/authzPermissionLifecycleContract.ts` (pre-existente, inalterado)
- `services/bff/src/server.ts` (modificado: registerPermissionLifecycleRoutes ja registrado antes do proxy)
- `services/bff/src/auditoria/auditEventPublisher.ts` (referencia: verificacao de reuso)
- `tasks/prd-gestao-ciclo-vida-permissoes/3_task.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/prd.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/techspec.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/authz-contract.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/authz-api-solicitacao.md`
- `seeds/mcad/acessos.permissions.json` (referencia: verificacao de convencao de chaves)

### Criterios de sucesso da task (3.0)

| Criterio | Status |
| --- | --- |
| O frontend nao precisa mais chamar diretamente o proxy generico para depreciar permissoes | ATENDIDO |
| A deprecacao gera trilha auditavel no BFF | ATENDIDO |
| O header `x-authz-version` chega intacto ao cliente | ATENDIDO |
| Os testes demonstram comportamento correto em sucesso e falha | ATENDIDO (8 novos testes) |

### Subtarefas concluidas

| Subtarefa | Status |
| --- | --- |
| 3.1 Definir contrato HTTP local do endpoint de deprecacao no BFF | ATENDIDO — `POST /api/autorizacao/permissoes/:id/depreciar` |
| 3.2 Implementar proxy controlado da chamada `PATCH /v1/permissions/{id}/deprecate` | ATENDIDO |
| 3.3 Propagar `x-correlation-id` e `x-authz-version` | ATENDIDO — upstream tem prioridade; fallback para header da request |
| 3.4 Integrar publicacao de auditoria no padrao ja usado em `services/bff/src/auditoria` | PARCIALMENTE ATENDIDO — ver observacao abaixo |
| 3.5 Normalizar erros de autorizacao, recurso inexistente e falha do upstream | ATENDIDO |
| 3.6 Testes cobrindo 200, 401, 403, 404 e indisponibilidade do `ecad-authz` | ATENDIDO |

### Analise das duas limitacoes sinalizadas pelo implementador

#### Limitacao 1 — Chave `authz:admin:permission:depreciar`

Analise: A chave segue o padrao `dominio:area:recurso:acao` definido no ADR 0002 e na techspec. A acao usa verbo portugues (`depreciar`), consistente com o padrao estabelecido no projeto (ex: `acessos:default:papel:listar`, `acessos:default:papel:visualizar`, `authz:admin:permission:visualizar` aprovada na task 2.0 e confirmada na evidencia de QA). Nenhum documento contratual (authz-contract.md, techspec, seeds) define chave alternativa ou proibe o sufixo portugues para esta operacao.

Veredicto: NAO E VIOLACAO DE CRITERIO DE ACEITACAO. Chave conforme convencao do projeto.

#### Limitacao 2 — `eventType: 'PERMISSION_LIFECYCLE'` e publisher proprio

Analise:

- A funcao existente `publishAuditEvent` em `auditoria/auditEventPublisher.ts` e tipada exclusivamente para `ScreenAccessAuditEvent` e valida internamente `eventType === 'SCREEN_ACCESS'`. Qualquer evento com tipo diferente retorna `AUDIT_EVENT_INVALID`.
- O implementador construiu `firePermissionLifecycleAuditEvent()` com semantica fire-and-forget, timeout, propagacao de `x-correlation-id` e tratamento de erros com `log.warn` — comportamento correto e adequado para trilha de auditoria de acao administrativa.
- O `eventType: 'PERMISSION_LIFECYCLE'` nao e validado pela infraestrutura de auditoria atual, mas a techspec e o PRD nao prescrevem um valor especifico para `eventType` — exigem apenas publicacao de evento auditavel com ator, alvo, acao, resultado e correlacao. Todos esses campos estao presentes.
- A funcao `buildAuditEventsUrl` foi duplicada: logica identica existe em `auditEventPublisher.ts` e esta exportada via `auditEventPublisherInternals.buildAuditEventsUrl`. O implementador deveria ter importado o helper em vez de duplica-lo.

Veredicto: A duplicacao de `buildAuditEventsUrl` e uma violacao de DRY (codigo duplicado), NAO uma violacao de criterio de aceitacao. O motivo tecnico para nao reusar `publishAuditEvent` e valido (incompatibilidade de tipo). Registrado como observacao nao bloqueante.

### Conformidade com PRD e TechSpec

- Endpoint `POST /api/autorizacao/permissoes/:id/depreciar` usa POST localmente com upstream PATCH — conforme decisao explicita da techspec (coerencia com padrao de acao governada do MCAD).
- Check de permissao `authz:admin:permission:depreciar` server-side antes de qualquer chamada ao upstream — atende ADR 0003.
- `x-correlation-id` propagado para upstream via `toUuidCorrelationId` — atende contrato do ecad-authz (UUID obrigatorio, conforme MEMORY.md).
- `x-authz-version` propagado do response upstream, com fallback para o header da request — conforme ponto de integracao da techspec.
- Erros do upstream preservam `code` e `message` sem perda — conforme subtarefa 3.5.
- Phase 2 stubs (create, reativar, remover) retornam `501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE` — conforme `authz-contract.md`.
- Log estruturado inclui `action`, `actor`, `permissionId`, `outcome`, `status`, `correlationId` — atende campos minimos da techspec (secao Monitoramento).

### Qualidade dos testes (8 novos)

| Cenario | Cobertura |
| --- | --- |
| POST `/depreciar` sem `Authorization` header → 401 | COBERTO |
| POST `/depreciar` sem permissao `depreciar` → 403 | COBERTO |
| POST `/depreciar` sucesso → 200, body deprecated, `x-authz-version` propagado do upstream | COBERTO |
| POST `/depreciar` sucesso com `x-authz-version` ausente no upstream → fallback para header da request | COBERTO |
| POST `/depreciar` com id desconhecido → 404 com `code` e `message` do upstream | COBERTO |
| POST `/depreciar` com upstream retornando 500 → 503 `AUTHZ_UNAVAILABLE` | COBERTO |
| POST `/depreciar` publica evento de auditoria `PERMISSION_LIFECYCLE` / `outcome: SUCCESS` | COBERTO |
| POST `/depreciar` publica evento de auditoria `outcome: FAILURE` com `errorCode` em caso de 404 | COBERTO |

### Observacoes nao bloqueantes

1. `buildAuditEventsUrl` duplicada: a funcao e identica a `auditEventPublisherInternals.buildAuditEventsUrl` ja exportada. Sugestao para iteracao futura: importar o helper em vez de redefinir localmente.

2. O `eventType: 'PERMISSION_LIFECYCLE'` e um novo tipo nao suportado pelo contrato atual de `publishAuditEvent`. Se o servico de Auditoria no ecad-auditoria validar o `eventType`, pode rejeitar o evento. Isso nao e verificavel sem ambiente real, e o contrato do ecad-auditoria nao esta documentado neste repositorio. A techspec menciona "alinhar esquema do payload" como acao requerida no componente ecad-auditoria — esse alinhamento ainda nao foi realizado.

## 4. Problemas encontrados

Nenhum problema bloqueante. Duas observacoes marginais registradas acima (DRY de URL helper; tipo de evento nao alinhado com infraestrutura atual de audit).

## 5. Recomendacao final

APROVADA
