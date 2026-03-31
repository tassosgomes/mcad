---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 4.0: Application — Queries (Listar + GetById) + Responses

## Visão Geral

Criar queries CQRS para listagem paginada e busca por ID, DTOs de response (ObraResponse com status, ISWC, obraDepuradaParaId; ObraListResponse; DepuracaoResponse).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Queries/ListarObrasQuery.cs` + Handler
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Queries/GetObraByIdQuery.cs` + Handler
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Responses/ObraResponse.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Responses/ObraListResponse.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Responses/DepuracaoResponse.cs`
- **Referência:**
  - `tasks/prd-gestao-obras/api-contract.yaml` (schemas)
  - `2-Application/Cadastro.Application/Titulares/Queries/` (padrão)
- **Skills:** `dotnet-architecture` — CQRS Queries

## Subtarefas

- [ ] 4.1 Criar `ObraResponse` record (id, titulo, subtitulo, tipo, genero, iswc, status, dominioPublico, obraDepuradaParaId, criadoEm, atualizadoEm)
- [ ] 4.2 Criar `ObraListResponse` e `DepuracaoResponse` records
- [ ] 4.3 Criar `ListarObrasQuery` + Handler (paginação + filtros + mapeamento)
- [ ] 4.4 Criar `GetObraByIdQuery` + Handler (NotFoundException se não encontrado)
- [ ] 4.5 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] ObraResponse inclui obraDepuradaParaId (nullable)
- [ ] ListarObrasQueryHandler retorna dados paginados
