---
status: completed
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Application (Queries: ListarPendentes, ListarImpacto)

## Visão Geral

Criar queries e handlers para listagem centralizada de pendentes e visão de impacto agrupada.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarPendentesQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarPendentesQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarImpactoPendentesQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarImpactoPendentesQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ExecucaoPendenteResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ImpactoPendenteResponse.cs`
- **Referência:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/ListarCaptacoesQueryHandler.cs` (padrão de query com filtros)

## Subtarefas

- [x] 2.1 Criar `ExecucaoPendenteResponse` com dados da captação (rubrica, período, analista, status)
- [x] 2.2 Criar `ImpactoPendenteResponse` com agrupamento + captações detalhadas
- [x] 2.3 Criar `ListarPendentesQuery` + handler — filtros, paginação, sort, mapping
- [x] 2.4 Criar `ListarImpactoPendentesQuery` + handler — agrupamento + detalhe de captações (segundo query)

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 4.0
- Paralelizável: Não

## Detalhes de Implementação

**ExecucaoPendenteResponse:**
```csharp
public record ExecucaoPendenteResponse(
    Guid Id, Guid CaptacaoId,
    string CaptacaoRubrica, string CaptacaoPeriodo, string CaptacaoStatus,
    string CaptacaoAnalistaResponsavel,
    Guid? ObraId, Guid? FonogramaId,
    string ObraTitulo, string? FonogramaIsrc, string? ObraIswc, string Interpretes,
    string Inicio, string Fim, int Quantidade,
    string Status, DateTime CriadoEm);
```

**ListarImpactoPendentesQueryHandler — lógica de 2 queries:**
```csharp
// 1. Buscar agrupamento
var agrupados = await _execucaoRepo.ListarImpactoPendentesAsync(query.Sort, query.Page, query.Size, ct);

// 2. Para cada grupo, buscar captações detalhadas
foreach (var grupo in agrupados.Items)
{
    var execucoes = await _execucaoRepo.ListarPendentesPorIdentificadorAsync(grupo.Identificador, ct);
    grupo.Captacoes = execucoes
        .GroupBy(e => e.CaptacaoId)
        .Select(g => new CaptacaoImpactoDto(
            g.Key, g.First().Captacao.Rubrica.Nome, g.First().Captacao.Periodo, g.Count()))
        .ToList();
}
```

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] ListarPendentes retorna execuções com dados da captação
- [x] ListarImpacto agrupa por ISRC/ISWC com contagem correta de captações
