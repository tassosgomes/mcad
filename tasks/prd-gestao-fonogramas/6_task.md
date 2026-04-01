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

# Tarefa 6.0: API — FonogramaEndpoints (7 endpoints) + Program.cs

## Visão Geral

7 endpoints: CRUD principal (5) + depurar (1) + fonogramas da obra sub-resource (1). Registrar DI.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/FonogramaEndpoints.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar IFonogramaRepository, MapFonogramaEndpoints()
- **Referência:**
  - `tasks/prd-gestao-fonogramas/api-contract.yaml`
  - `1-Services/.../Endpoints/ObraEndpoints.cs` (padrão depuração)

## Subtarefas

- [x] 6.1 Criar `FonogramaEndpoints` com 2 MapGroups: `/api/v1/fonogramas` (GET list, POST, GET/{id}, PUT/{id}, DELETE/{id}, POST/{id}/depurar) e `/api/v1/obras/{obraId:guid}/fonogramas` (GET)
- [x] 6.2 GET /fonogramas → ListarFonogramasQuery (query params → FonogramaFiltro)
- [x] 6.3 POST /fonogramas → CriarFonogramaCommand → 201 + Location
- [x] 6.4 GET /fonogramas/{id} → GetFonogramaByIdQuery
- [x] 6.5 PUT /fonogramas/{id} → AtualizarFonogramaCommand (pode retornar 409)
- [x] 6.6 DELETE /fonogramas/{id} → ExcluirFonogramaCommand → 204 ou 409
- [x] 6.7 POST /fonogramas/{id}/depurar → DepurarFonogramaCommand → 201 + Location
- [x] 6.8 GET /obras/{obraId}/fonogramas → ListarFonogramasPorObraQuery → array direto
- [x] 6.9 Atualizar Program.cs: registrar IFonogramaRepository, MapFonogramaEndpoints()

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] POST /fonogramas → 201 (PENDENTE_VALIDACAO)
- [x] POST /fonogramas com ISRC duplicado → 409
- [x] PUT /fonogramas/{id} LIBERADO + ISRC diferente → 409 DEPURACAO_NECESSARIA
- [x] POST /fonogramas/{id}/depurar → 201 DepuracaoFonogramaResponse
- [x] DELETE /fonogramas/{id} LIBERADO → 409
- [x] GET /obras/{obraId}/fonogramas → 200 array
