---
status: pending
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 6.0: Gestão de Dados de Contato (RF-09 a RF-13)

## Visão Geral

Permitir que o titular autenticado edite diretamente seus dados de contato (endereço, telefone, e-mail). A alteração é aplicada imediatamente no cadastro (sem aprovação), registrada na auditoria two-tier existente e publica o evento `cadastro.titular.contato.atualizado` via Outbox.

## Requisitos

- RF-09 (editar endereço/telefone/e-mail), RF-10 (aplicação imediata), RF-11 (validar formato), RF-12 (auditoria com valor anterior), RF-13 (evento outbox)
- Tech Spec — seção *Extensão de Titular* e *Fluxo de Aprovação*

## Subtarefas

- [ ] 6.1 Criar `2-Application/Cadastro.Application/Portal/Commands/AtualizarContatoCommand.cs` (`record AtualizarContatoCommand(Guid TitularId, string? Email, EnderecoDto? Endereco, IReadOnlyList<TelefoneDto> Telefones) : ICommand<ContatoResponse>`).
- [ ] 6.2 Criar `AtualizarContatoCommandValidator.cs` — delega validação estrutural mínima; validação algorítmica fica nos VOs (`Email.Create`, `Cep.Create`, etc.).
- [ ] 6.3 Criar `AtualizarContatoCommandHandler.cs`:
  1. Carregar `titular` via `ITitularRepository.GetByIdForUpdateAsync(titularId, ct)` (tracked).
  2. Se `titular == null` → `NotFoundException`.
  3. Construir VOs: `Email.Create(dto.Email)`, `Endereco.Create(...)`, lista de `TelefoneTitular` (com `TipoTelefone` e `Telefone.Create`).
  4. `titular.AtualizarContato(email, endereco, telefones)` — o domínio valida cap 5 e invariantes.
  5. Audit publisher (`TitularAuditPublisher` / `TitularAuditEventFactory`) já produz diff before/after — garantir que o snapshot "antes" é capturado **antes** da mutação (RF-12).
  6. `_outbox.AddEvent(EventTypes.TitularContatoAtualizado, titular.Id.ToString(), payload)` (RF-13).
  7. `_repository.SaveChangesAsync(ct)` — atômico (entidade + outbox + audit).
  8. Retornar `ContatoResponse` com os dados atualizados.
- [ ] 6.4 Criar endpoint `PUT /api/v1/portal/me/contato` em `PortalEndpoints.cs` (ou `PortalAuthEndpoints.cs`) — `.RequireAuthorization("PortalTitular")`, injeta `ICurrentTitular` para obter `titularId`.
- [ ] 6.5 Criar endpoint `GET /api/v1/portal/me` — retorna dados básicos do titular autenticado (id, nome, documento mascarado, contato atual). Protegido por `PortalTitular`.
- [ ] 6.6 DTOs: `EnderecoDto` (cep, logradouro, numero, complemento, bairro, cidade, uf), `TelefoneDto` (tipo, numero), `ContatoResponse` (email, endereco, telefones). Em `2-Application/Cadastro.Application/Portal/Responses/`.
- [ ] 6.7 Testes unitários (`5-Tests/Cadastro.UnitTests/Portal/`):
  - `AtualizarContatoCommandHandlerTests.cs` — e-mail inválido → `DomainException`; CEP inválido → `DomainException`; UF inexistente → `DomainException`; >5 telefones → `DomainException`; sucesso → audit publisher chamado com diff + outbox `AddEvent("cadastro.titular.contato.atualizado")` chamado.
  - Verificar que o snapshot "antes" da auditoria reflete o valor anterior (RF-12).

## Sequenciamento

- Bloqueado por: 3.0 (Titular estendido persistível), 4.0 (`ICurrentTitular`)
- Desbloqueia: 14.0 (página de contato no frontend)
- Paralelizável: Sim (independente de 7.0, 8.0, 9.0 — não compartilha handlers/arquivos)

## Detalhes de Implementação

**Auditoria two-tier:** o padrão existente (`TitularAuditPublisher` + `TitularAuditEventFactory` + `EfAuditOutboxClient`) já captura o diff antes/depois de mutações em `Titular`. Para que a captura do "antes" funcione, o handler deve obter o titular tracked, e o publisher deve ler o estado original **antes** de chamar `AtualizarContato`. Seguir o padrão de `CriarTitularCommandHandler`/`AtualizarTitularCommandHandler` existentes (onde o audit captura `OriginalValues`).

**Evento Outbox:** `_outbox.AddEvent(EventTypes.TitularContatoAtualizado, titular.Id.ToString(), new { titularId = titular.Id, email, atualizadoEm = DateTime.UtcNow })`. O `EventTypes` já foi estendido na tarefa 2.0.

**ViaCEP (frontend-only):** o backend **não** chama ViaCEP no save — o VO `Cep` valida apenas formato (8 dígitos). O auto-preenchimento ViaCEP é implementado na tarefa 14.0 (frontend).

## Critérios de Sucesso

- Titular autenticado altera e-mail/telefone/endereço e a alteração reflete em `GET /portal/me` (RF-09, RF-10).
- Formatos inválidos (e-mail, CEP, UF, >5 telefones) rejeitados com 422 (RF-11).
- Auditoria registra valor anterior, novo valor, autor (titularId) e data (RF-12).
- Evento `cadastro.titular.contato.atualizado` aparece em `outbox_events` (RF-13).
- Um titular não consegue alterar dados de outro (filtro por `ICurrentTitular.TitularId`).
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
