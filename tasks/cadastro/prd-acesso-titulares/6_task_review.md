# Task 6.0 — Review Report — Gestão de Dados de Contato (RF-09 a RF-13)

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Tech Spec:** `tasks/cadastro/prd-acesso-titulares/techspec.md`
> **Task:** `tasks/cadastro/prd-acesso-titulares/06_task.md`
> **Data:** 2026-06-15
> **Branch:** `feature/prd-acesso-titulares`
> **Stack:** .NET 8 (cadastro-api)

---

## 1. Validação Automatizada

### Build

```
dotnet build services/cadastro-api/Cadastro.sln
→ 7 projects, 0 errors, 2 warnings (pre-existing NU1902 OpenTelemetry — não relacionadas)
```

**Resultado:** ✅ PASS (0 errors)

### Testes Unitários

```
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --nologo
→ 288 tests passed, 0 failed (2 warnings NU1902 pré-existentes)
```

**Resultado:** ✅ PASS (288/288 — sem regressão)

> Testes de integração (WebApplicationFactory + Testcontainers) deliberadamente
> adiados para a task 16.0 conforme especificado no assignment.

---

## 2. Arquivos Implementados (verificados independentemente)

| Arquivo | Status |
|---|---|
| `2-Application/Cadastro.Application/Portal/Commands/AtualizarContatoCommand.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Commands/AtualizarContatoCommandValidator.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Commands/AtualizarContatoCommandHandler.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Responses/ContatoResponse.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Responses/EnderecoDto.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Responses/TelefoneDto.cs` | ✅ Criado |
| `2-Application/Cadastro.Application/Portal/Responses/MeuTitularResponse.cs` | ✅ Criado |
| `1-Services/Cadastro.API/Endpoints/PortalEndpoints.cs` | ✅ Criado |
| `5-Tests/Cadastro.UnitTests/Portal/AtualizarContatoCommandHandlerTests.cs` | ✅ Criado (11 testes) |
| `1-Services/Cadastro.API/Program.cs` | ✅ Modificado (linha 284: `app.MapPortalEndpoints();`) |
| `2-Application/Cadastro.Application/Audit/TitularAuditEventFactory.cs` | ✅ Modificado (+campos de contato em `TitularMap`) |
| `2-Application/Cadastro.Application/Audit/TitularAuditOperation.cs` | ✅ Modificado (+`AtualizarContato`) |

---

## 3. Review Técnico por Requisito / Subtarefa

### 6.1 — Command (`AtualizarContatoCommand`) ✅
Record `ICommand<ContatoResponse>` com shape exato da task:
`(Guid TitularId, string? Email, EnderecoDto? Endereco, IReadOnlyList<TelefoneDto> Telefones)`.
XML doc explicita que `TitularId` vem do JWT (anti-tampering) e que validação algorítmica fica nos VOs.

### 6.2 — Validator ✅
`AtualizarContatoCommandValidator` faz apenas validação estrutural (não-nulos, max-length, shape de UF=2 chars, tipo de telefone em {CELULAR, RESIDENCIAL, COMERCIAL}). Validação algorítmica corretamente delegada aos VOs no handler — alinhado à skill `dotnet-architecture` e ao padrão `CriarTitularCommandHandler`.

### 6.3 — Handler (`AtualizarContatoCommandHandler`) ✅
Pipeline correto, seguindo `CriarTitularCommandHandler`:
1. ✅ FluentValidation → `ValidationException` (422) se falha estrutural.
2. ✅ `GetByIdForUpdateAsync` (tracked) — `NotFoundException` se nulo.
3. ✅ `LogScope("{TitularId}", ...)` — correlação de logs conforme `dotnet-observability`.
4. ✅ **RF-12 (CRÍTICO)**: `_auditPublisher.Snapshot(titular)` capturado **ANTES** de `AtualizarContato` (linha 71, mutação na linha 99). Teste `HandleAsync_ComDadosValidos_DeveCapturarSnapshotAntesAntesDaMutacao` prova empiricamente que o `titular.Email` no momento do snapshot ainda é `"antigo@exemplo.com"`.
5. ✅ VOs construídos com factories (`Email.Create`, `Endereco.Create`, `Cep.Create`, `Uf.Create`, `Telefone.Create`) que lançam `DomainException` (422) em formato inválido.
6. ✅ `titular.AtualizarContato(...)` aplica mutação; domínio impõe cap 5 (`Titular.cs:155-156`).
7. ✅ `PublishAsync(titular, TitularAuditOperation.AtualizarContato, before, ct)` — auditoria two-tier.
8. ✅ `_outbox.AddEvent("cadastro.titular.contato.atualizado", ...)` (RF-13).
9. ✅ `SaveChangesAsync` único — atômico (entidade + outbox + audit).

### 6.4 — Endpoint `PUT /api/v1/portal/me/contato` ✅
- `PortalEndpoints.cs:33`: rota mapeada, `RequireAuthorization("PortalTitular")` no route group.
- `titularId` extraído de `ICurrentTitular` (JWT), nunca do body — `AtualizarContatoRequest` não tem campo `TitularId`.
- Anti-tampering explícito no comentário da linha 104.

### 6.5 — Endpoint `GET /api/v1/portal/me` ✅
- `PortalEndpoints.cs:28`: rota `GET /me`, protegida por `PortalTitular`.
- Retorna `MeuTitularResponse` com documento mascarado via `DocumentoMasking.Apply(..., fullAllowed: false)` (LGPD).
- `contato` aninhado reflete estado atual — RF-10 atendido.

### 6.6 — DTOs ✅
Shapes corretos:
- `EnderecoDto(cep, logradouro, numero, complemento?, bairro, cidade, uf)` — espelha VO `Endereco`.
- `TelefoneDto(tipo, numero)`.
- `ContatoResponse(email?, endereco?, telefones)`.
- `MeuTitularResponse(id, nome, tipo, documento, documentoFormatado, contato?)`.
- Nenhum DTO expõe `SenhaHash` ou segredos.

### 6.7 — Testes Unitários ✅
11 testes em `AtualizarContatoCommandHandlerTests.cs`, cobrindo:
- ✅ RF-11 email inválido → `DomainException`.
- ✅ RF-11 CEP inválido → `DomainException`.
- ✅ RF-11 UF inexistente → `DomainException`.
- ✅ RF-11 >5 telefones → `DomainException`.
- ✅ RF-11 telefone formato inválido → `DomainException`.
- ✅ Titular inexistente → `NotFoundException`.
- ✅ RF-09/RF-10 sucesso atualiza contato e persiste.
- ✅ RF-13 `AddEvent("cadastro.titular.contato.atualizado")` chamado uma vez.
- ✅ RF-12 snapshot "antes" reflete valor anterior (teste empírico com `.Callback`).
- ✅ RF-12 `PublishAsync` chamado com `TitularAuditOperation.AtualizarContato` e snapshot "antes".
- ✅ Limpeza de contato (null/empty) funciona e ainda publica evento.
- ✅ Tipo case-insensitive ("celular" → `CELULAR`).

---

## 4. Requisitos Funcionais (RF-09 a RF-13)

| RF | Status | Evidência |
|---|---|---|
| **RF-09** editar endereço/telefone/email | ✅ | `AtualizarContato` em `Titular.cs:148-162`; endpoint `PUT /me/contato`. |
| **RF-10** aplicação imediata + reflete em `GET /me` | ✅ | `SaveChangesAsync` único; `GetMe` lê `titularRepository.GetByIdAsync` e monta `ContatoResponse` do estado atual. Teste `HandleAsync_ComDadosValidos_DeveAtualizarContatoEPersistir` valida `result.Email == "novo@exemplo.com"`. |
| **RF-11** validação de formato → 422 | ✅ | 5 testes cobrindo email/CEP/UF/telefone/cap-5 lançam `DomainException` (mapeada a 422). `SaveChanges` nunca chamado em falha. |
| **RF-12** auditoria com valor anterior | ✅ | `Snapshot(titular)` chamado **antes** da mutação (linha 71 < linha 99); `TitularAuditEventFactory.TitularMap` estendido com `email`, `endereco`, `telefones` — diff before/after significativo. `TitularAuditOperation.AtualizarContato` adicionado com `DataAction.UPDATE`. Teste empírico via `.Callback` prova a ordem. |
| **RF-13** evento outbox `cadastro.titular.contato.atualizado` | ✅ | `_outbox.AddEvent("cadastro.titular.contato.atualizado", titular.Id.ToString(), new { titularId, email, atualizadoEm })`; atômico com `SaveChangesAsync`. Teste verifica chamada com routing key exato. |

### Pontos de Segurança

| Aspecto | Status |
|---|---|
| **Anti-tampering** — `titularId` do JWT | ✅ Ambos endpoints leem `ICurrentTitular.TitularId`; `AtualizarContatoRequest` não tem campo `titularId`. |
| **Autorização** — `RequireAuthorization("PortalTitular")` | ✅ Route group inteiro; scheme "Titular". |
| **LGPD** — documento mascarado | ✅ `DocumentoMasking.Apply(..., fullAllowed: false)` no `GET /me`. |
| **Sem secrets expostos** | ✅ Nenhum DTO carrega `SenhaHash`/token. |
| **Log scope** — `TitularId` sem documento | ✅ `BeginScope({TitularId})` no handler. |

---

## 5. Desvio Avaliado: String Literal vs `EventTypes.TitularContatoAtualizado`

### Alegação do Implementer
O handler usa `_outbox.AddEvent("cadastro.titular.contato.atualizado", ...)` (string literal) em vez de `EventTypes.TitularContatoAtualizado`. Justificativas alegadas:
1. Application não referencia Infra (Clean Architecture).
2. `CriarTitularCommandHandler` já usa string literal da mesma forma.

### Verificação

**Claim (a) — VERDADEIRO.** `EventTypes` reside em `4-Infra/Cadastro.Infra/Events/EventTypes.cs` (namespace `Cadastro.Infra.Events`). A camada `2-Application` não referencia `4-Infra` (dependências inward-pointing, confirmado via `dotnet-architecture`). Portanto, referenciar `EventTypes.TitularContatoAtualizado` diretamente do handler **violaria** a regra arquitetural.

**Claim (b) — VERDADEIRO.** `CriarTitularCommandHandler.cs:95` usa literal `"cadastro.titular.criado"` exatamente pelo mesmo motivo. O implementer está seguindo o padrão existente do codebase de forma consistente.

**Verificação de typo:** O literal `"cadastro.titular.contato.atualizado"` no handler (linha 112) é **idêntico** ao valor de `EventTypes.TitularContatoAtualizado` (linha 25 de `EventTypes.cs`). Sem typo.

### Veredito sobre o Desvio

**ACEITÁVEL (não-bloqueante), com observação.** O implementer fez a escolha correta dado o estado atual do codebase: respeitar Clean Architecture > seguir texto literal da techspec. O padrão existente (`CriarTitularCommandHandler`) confirma que este é o tratamento convencional.

**Observação arquitetural (não-bloqueante, futura):** O techspec dizia literalmente `EventTypes.TitularContatoAtualizado`, sugerindo que a constante deveria ser referenciável. A lacuna estrutural real é que `EventTypes` está na camada errada — deveria morar em `2-Application` (ou num módulo `Contracts`/`Domain.Shared`) para que handlers possam referenciá-la sem violar dependências. Isso eliminaria o risco de typo em todos os 20+ handlers do domínio. Recomenda-se abrir uma task separada de refatoração (`mover EventTypes para Application`) — não é bloqueador para esta task.

### Convenções CQRS/Audit ✅
O handler espelha fielmente o padrão de `CriarTitularCommandHandler` e `AtualizarTitularCommandHandler`:
- Mesma ordem: validator → carregar tracked → snapshot antes → mutar → audit publish → outbox → save.
- Mesmo tipo de retorno (`ContatoResponse` mapeado em método `private static`).
- Mesma semântica de `DomainException`/`NotFoundException`/`ValidationException`.

---

## 6. Issues Encontrados

**Nenhum issue bloqueante.**

### Observações menores (não-bloqueantes)

1. **Redundância em teste (cosmético):** Em `AtualizarContatoCommandHandlerTests.cs:173-175`, o teste `HandleAsync_ComMaisDeCincoTelefones_DeveLancarDomainException` re-setupa o `_mockValidator` com o mesmo valor já definido no construtor. O setup é redundante — não afeta o resultado do teste. Sugestão: remover as 3 linhas.

2. **Divergência documentação vs implementação (futura):** `EventTypes` em `4-Infra` impede que o techspec seja seguido literalmente. Recomendado mover para camada compartilhada (task futura de refatoração).

Nenhum dos dois é suficiente para reprovar.

---

## 7. Recomendação Final

# ✅ APROVADA

A task 6.0 está completa, correta e alinhada com:
- Task file (6.1 a 6.7 + Critérios de Sucesso) ✅
- PRD RF-09, RF-10, RF-11, RF-12, RF-13 ✅
- Tech Spec (Extensão de Titular, Fluxo de Aprovação, Eventos) ✅
- Skills `dotnet-architecture`, `dotnet-code-quality`, `dotnet-testing` ✅
- Padrões existentes (`CriarTitularCommandHandler`, `TitularAuditEventFactory`) ✅

O desvio do string literal é justificado e consistente com o codebase. Build verde, 288 testes verdes, sem regressão.

---

## 8. Telemetria de Qualidade

- **Issues bloqueantes:** 0
- **Issues não-bloqueantes:** 2 (cosmético em teste + localização arquitetural de `EventTypes`)
- **Iterações até estabilização:** 1
- **Cobertura de testes da unidade:** 11 testes cobrindo happy path, todos os 5 caminhos de `DomainException` (RF-11), `NotFoundException`, auditoria pré-mutação (RF-12) e outbox (RF-13).

Quality ledger atualizado em `docs/ai-dev/quality-ledger.md`.
