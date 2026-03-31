---
status: done
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 9.0: Testes Integração — Endpoints completos

## Visão Geral

Testes de integração dos 8 endpoints via WebApplicationFactory + Testcontainers + mock da API ISWC (HttpClient mock para isolar de serviço externo).

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.IntegrationTests/ObraEndpointsTests.cs`
- **Referência:**
  - `5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` (existente)
  - `5-Tests/Cadastro.IntegrationTests/TitularEndpointsTests.cs` (padrão)
- **Skills:** `dotnet-testing` — Testcontainers, WebApplicationFactory, mock HttpClient

## Subtarefas

- [ ] 9.1 POST /obras → 201 (PENDENTE, sem ISWC)
- [ ] 9.2 GET /obras?page=1&size=5&titulo=meu → 200 paginado + filtrado
- [ ] 9.3 GET /obras/{id} → 200
- [ ] 9.4 GET /obras/{id-inexistente} → 404
- [ ] 9.5 PUT /obras/{id} PENDENTE → 200
- [ ] 9.6 PUT /obras/{id} LIBERADO com título diferente → 409 code=DEPURACAO_NECESSARIA
- [ ] 9.7 POST /obras/{id}/depurar → 201 com obraDepurada + novaObra
- [ ] 9.8 POST /obras/{id}/iswc (mock HttpClient) → 200 com ISWC
- [ ] 9.9 POST /obras/{id}/iswc sem titulares → 422
- [ ] 9.10 PUT /obras/{id}/dominio-publico → 200
- [ ] 9.11 DELETE /obras/{id} DEPURADA → 409
- [ ] 9.12 DELETE /obras/{id} sem vínculos → 204

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test --filter "Namespace~IntegrationTests"` — todos passam
- [ ] Mínimo 12 testes de integração
- [ ] API ISWC mockada (não chama serviço real nos testes)
