---
status: done
parallelizable: false
blocked_by: ["4.0", "5.0", "6.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: API — TitularEndpoints + Program.cs + GlobalExceptionHandler

## Visão Geral

Criar os 5 endpoints CRUD (Minimal API), registrar ITitularRepository, Command Handlers e Validators no DI, e estender o GlobalExceptionHandler para ConflictException (409), ValidationException (400) e DomainException (422).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar ITitularRepository, Scrutor scan de CommandHandlers, FluentValidation validators, `app.MapTitularEndpoints()`
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — adicionar: ConflictException→409, ValidationException→400, DomainException→422
- **Referência:**
  - `tasks/prd-gestao-titulares/api-contract.yaml` — contrato
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs` — padrão a seguir
- **Skills:** `dotnet-architecture` — Minimal API; `common/restful-api` — ProblemDetails, paginação

## Subtarefas

- [ ] 7.1 Criar `TitularEndpoints` com MapGroup("/api/v1/titulares") e 5 endpoints (GET list, POST, GET by id, PUT, DELETE)
- [ ] 7.2 GET list: receber query params (page, size, sort, nome, documento, associacaoId, status), construir TitularFiltro, despachar query
- [ ] 7.3 POST: receber body, despachar CriarTitularCommand, retornar 201 + Location header
- [ ] 7.4 PUT: receber id + body, despachar AtualizarTitularCommand
- [ ] 7.5 DELETE: receber id, despachar ExcluirTitularCommand, retornar 204
- [ ] 7.6 Atualizar GlobalExceptionHandler: ConflictException→409, ValidationException→400, DomainException→422
- [ ] 7.7 Atualizar Program.cs: registrar ITitularRepository, scan CommandHandlers, validators, MapTitularEndpoints
- [ ] 7.8 Testar manualmente com curl

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet run` inicia sem erros
- [ ] `POST /api/v1/titulares` com dados válidos → 201 com TitularResponse + Location header
- [ ] `POST /api/v1/titulares` com CPF duplicado → 409 ProblemDetails
- [ ] `POST /api/v1/titulares` com CPF inválido → 422 ProblemDetails
- [ ] `GET /api/v1/titulares?page=1&size=5&nome=dj` → 200 com paginação
- [ ] `GET /api/v1/titulares/{id}` → 200 com documentoFormatado e associação aninhada
- [ ] `PUT /api/v1/titulares/{id}` → 200 (tipo/documento ignorados se enviados)
- [ ] `DELETE /api/v1/titulares/{id}` sem vínculos → 204
- [ ] `GET /health` continua funcionando
