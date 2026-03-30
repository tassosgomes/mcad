---
status: done
parallelizable: true
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 5.0: Application — Queries (Listar paginado + GetById) + Responses

## Visão Geral

Criar queries CQRS para listagem paginada com filtros e busca por ID, handlers com mapeamento manual, e DTOs de response (TitularResponse, TitularListResponse com documentoFormatado e associação aninhada).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/GetTitularByIdQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/GetTitularByIdQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Responses/TitularResponse.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Responses/TitularListResponse.cs`
- **Referência:**
  - `tasks/prd-gestao-titulares/api-contract.yaml` — schemas de response
- **Skills:** `dotnet-architecture` — CQRS Queries, mapeamento manual

## Subtarefas

- [ ] 5.1 Criar `TitularResponse` record (id, nome, tipo, documento, documentoFormatado, nacionalidade, caeIpi, associacao, status, criadoEm, atualizadoEm)
- [ ] 5.2 Criar `AssociacaoResumoResponse` record (id, sigla, nome) — reutilizável
- [ ] 5.3 Criar `TitularListResponse` record (data, pagination)
- [ ] 5.4 Criar `ListarTitularesQuery` record com filtros → `IQuery<TitularListResponse>`
- [ ] 5.5 Criar `ListarTitularesQueryHandler` — delega para ITitularRepository.ListarAsync, mapeia response com documentoFormatado via VO
- [ ] 5.6 Criar `GetTitularByIdQuery` + handler (NotFoundException se não encontrado)

## Detalhes de Implementação

`documentoFormatado` vem diretamente de `titular.DocumentoFormatado` (propriedade derivada da entidade que delega para Cpf.Formatado ou Cnpj.Formatado). Associação mapeada como objeto aninhado no response.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] TitularResponse inclui documentoFormatado e associação aninhada
- [ ] ListarTitularesQueryHandler retorna dados paginados com total/totalPages
