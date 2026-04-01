---
status: completed
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 5.0: Application — Queries (ListarParticipacoes) + Responses

## Visão Geral

Query CQRS para listar participações de um fonograma com titular incluso, soma, flags somaCalculada e percentuaisDesatualizados. DTOs de response.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Participacoes/Queries/ListarParticipacoesQuery.cs` + Handler
  - `2-Application/.../Participacoes/Responses/ParticipacoesResponse.cs`
  - `2-Application/.../Participacoes/Responses/ParticipacaoItemResponse.cs`

## Subtarefas

- [ ] 5.1 Criar `ParticipacoesResponse` record (fonogramaId, participacoes[], somaPercentual nullable, somaCalculada, percentuaisDesatualizados)
- [ ] 5.2 Criar `ParticipacaoItemResponse` record (id, titular TitularResumoResponse, categoria, percentual nullable, editavel)
- [ ] 5.3 Criar `ListarParticipacoesQuery(Guid FonogramaId)` + Handler: Include Titular, calcula soma (null se algum percentual null), somaCalculada = todos não-null, percentuaisDesatualizados do fonograma
- [ ] 5.4 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Retorna somaCalculada=false se algum percentual é null
- [ ] Retorna percentuaisDesatualizados do fonograma
