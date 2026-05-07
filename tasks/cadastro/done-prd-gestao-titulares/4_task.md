---
status: done
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"6.0, 7.0"</unblocks>
</task_context>

# Tarefa 4.0: Application — Dispatcher SendAsync + Exceptions

## Visão Geral

Estender o Dispatcher CQRS existente com suporte a Commands (`SendAsync`), criar exceptions de aplicação (ConflictException, ValidationException) e atualizar o mapeamento no GlobalExceptionHandler.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/ConflictException.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/ValidationException.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Responses/PaginationResponse.cs`
- **Modificar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IDispatcher.cs` — adicionar `SendAsync<TResult>(ICommand<TResult>, CancellationToken)`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/Dispatcher.cs` — implementar `SendAsync` via reflection (mesmo padrão de QueryAsync)
- **Skills:** `dotnet-architecture` — CQRS, Dispatcher; `dotnet-code-quality` — error handling

## Subtarefas

- [ ] 4.1 Adicionar `SendAsync` ao `IDispatcher` e `Dispatcher`
- [ ] 4.2 Criar `ConflictException` (para documento duplicado e vínculos)
- [ ] 4.3 Criar `ValidationException` (para FluentValidation)
- [ ] 4.4 Criar `PaginationResponse` record (page, size, total, totalPages)
- [ ] 4.5 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Dispatcher.SendAsync resolve CommandHandlers via DI
- [ ] ConflictException e ValidationException existem com propriedades adequadas
