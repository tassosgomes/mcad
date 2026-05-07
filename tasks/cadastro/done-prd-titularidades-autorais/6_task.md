---
status: completed
parallelizable: false
blocked_by: ["4.0", "5.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: API — TitularidadeEndpoints + Program.cs + Fix ObterIswcHandler

## Visão Geral

Criar 5 endpoints (4 sub-resource de obras + 1 autocomplete), registrar DI, e conectar o ObterIswcCommandHandler (F03) com titularidades reais (nomes de autores + associação do titular com maior %).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularidadeEndpoints.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar ITitularidadeRepository, MapTitularidadeEndpoints()
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Commands/ObterIswcCommandHandler.cs` — conectar titularidades reais: buscar autores + associação do titular com maior percentual (desempate: primeiro por CriadoEm)
- **Referência:**
  - `tasks/prd-titularidades-autorais/api-contract.yaml`
  - `1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs` (padrão)
- **Skills:** `dotnet-architecture` — Minimal API, sub-resources; `common/restful-api`

## Subtarefas

- [ ] 6.1 Criar `TitularidadeEndpoints` com 2 MapGroups: `/api/v1/obras/{obraId:guid}/titularidades` (GET, POST, PUT/{id}, DELETE/{id}) e `/api/v1/titulares/busca` (GET autocomplete)
- [ ] 6.2 GET /obras/{obraId}/titularidades → ListarTitularidadesQuery
- [ ] 6.3 POST /obras/{obraId}/titularidades → AdicionarTitularidadeCommand → 201
- [ ] 6.4 PUT /obras/{obraId}/titularidades/{id} → EditarTitularidadeCommand → 200
- [ ] 6.5 DELETE /obras/{obraId}/titularidades/{id} → RemoverTitularidadeCommand → 200 com body
- [ ] 6.6 GET /titulares/busca?q=&limit= → BuscarTitularesQuery
- [ ] 6.7 Atualizar Program.cs: registrar ITitularidadeRepository, MapTitularidadeEndpoints()
- [ ] 6.8 Fix ObterIswcCommandHandler: injetar ITitularidadeRepository, buscar titularidades, extrair nomes (autores), selecionar associação do titular com maior percentual (empate → primeiro por CriadoEm)
- [ ] 6.9 Testar manualmente com curl

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `POST /api/v1/obras/{id}/titularidades` → 201 com TitularidadesResponse (soma atualizada)
- [ ] `DELETE /api/v1/obras/{id}/titularidades/{tid}` → 200 com body (soma atualizada)
- [ ] `GET /api/v1/titulares/busca?q=dj` → 200 array de TitularResumo
- [ ] `POST /api/v1/obras/{id}/iswc` (F03) agora usa titulares reais, não placeholder
- [ ] `POST /api/v1/obras/{id}/titularidades` em obra LIBERADA → 409 DEPURACAO_NECESSARIA
