---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0", "3.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>integration</type>
<scope>http_server</scope>
<complexity>high</complexity>
<dependencies>http_server, database, external_apis</dependencies>
<unblocks>"5.0, 7.0"</unblocks>
</task_context>

# Tarefa 4.0: Expor endpoints compostos, erros HTTP e testes de integração

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (direta)
- [HU-02] Reutilizar titular existente (direta)
- [HU-03] Corrigir erros antes de gravar (direta)
- [HU-04] Consultar o resultado (direta)

## Requisitos

- RF-05, RF-16–RF-23: superfície REST protegida, erros contratuais e persistência comprovada por integração.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/RepertorioEndpoints.cs`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/RepertorioEndpointsTests.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (mapear endpoints)
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` (`502` com código seguro)
- **Referência:**
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs`
  - endpoints existentes de Obras e Titulares
- **Skills:** dotnet-architecture, dotnet-testing, dotnet-code-quality, dotnet-production-readiness, common/restful-api.

## Subtarefas

- [ ] 4.1 Mapear `GET /api/v1/repertorios/titulares?documento=`, `POST /api/v1/repertorios` e `POST /api/v1/repertorios/pendentes` para dispatcher/contratos da feature.
- [ ] 4.2 Exigir `CadastroPermissions.RepertorioCriar` em todos os endpoints e retornar `Location: /api/v1/obras/{obraId}` nos `201`.
- [ ] 4.3 Converter indisponibilidade ISWC em `502 ProblemDetails` com `code: ISWC_INDISPONIVEL`; preservar `400`, `409`, `422` e `403` conforme o contrato.
- [ ] 4.4 Usar `CadastroApiFactory`, PostgreSQL real e mock de `IIswcService` para os cenários de integração.
- [ ] 4.5 Preparar a superfície para exportação OpenAPI; não editar o JSON gerado manualmente nesta tarefa.

## Sequenciamento

- Bloqueado por: 1.0, 2.0 e 3.0.
- Desbloqueia: 5.0 e 7.0.
- Paralelizável: Não — valida a integração do fluxo inteiro.

## Rastreabilidade

- Esta tarefa cobre: RF-05, RF-16–RF-23 e suporta RF-18/RF-19 por respostas de consulta.
- Evidência esperada: respostas HTTP, banco/audit/outbox e `403` no teste de integração.

## Detalhes de Implementação

O GET retorna somente resumo mascarado compatível com LGPD e admite zero ou um resultado. Não transportar documento completo em detalhes de erro ou logs. A autorização deve estar no endpoint, não apenas na ação do frontend. Usar `ProblemDetails`, rotas versionadas e respostas consistentes.

**Convenções da stack:** Minimal APIs finas, CQRS nativo, `CancellationToken` da requisição, `WebApplicationFactory`/PostgreSQL nos testes e logs estruturados sem interpolação.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/5-Tests/Cadastro.IntegrationTests --filter 'FullyQualifiedName~RepertorioEndpointsTests'` passa.
- [ ] Integração verifica `201` + `Location`, tabelas/audit/outbox no sucesso e contagens zeradas para ISRC duplicado ou ISWC indisponível.
- [ ] Integração verifica `POST /pendentes` com Obra PENDENTE/Fonograma PENDENTE_DOCUMENTACAO, `403` sem permissão e lookup seguro.
- [ ] A resposta ISWC falha como `502` com `ISWC_INDISPONIVEL`, sem dados locais persistidos.
