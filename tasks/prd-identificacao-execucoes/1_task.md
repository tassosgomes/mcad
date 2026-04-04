---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/domain+infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0, 3.0"</unblocks>
</task_context>

# Tarefa 1.0: Backend — Domain (Execucao.Resolver) + Infra (queries de pendentes)

## Visão Geral

Adicionar método `Resolver()` à entidade Execução e implementar os novos métodos de query no ExecucaoRepository para listar pendentes com dados da captação, agrupar por ISRC/ISWC com contagem de impacto, e listar pendentes com obraId para re-verificação.

## Arquivos Envolvidos

- **Modificar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Execucao.cs` (adicionar `Resolver()`)
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs` (adicionar 4 métodos)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` (implementar)
- **Referência:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs` (padrão de query)
  - `tasks/prd-identificacao-execucoes/techspec.md` (SQL conceitual de impacto)

## Subtarefas

- [x] 1.1 Adicionar método `Execucao.Resolver(obraId, fonogramaId, titulo, isrc, iswc, interpretes)` — transição PENDENTE → IDENTIFICADA
- [x] 1.2 Adicionar ao `IExecucaoRepository`: `ListarPendentesAsync`, `ListarImpactoPendentesAsync`, `ListarPendentesPorIdentificadorAsync`, `ListarPendentesComObraIdAsync`
- [x] 1.3 Implementar `ListarPendentesAsync` — join com Captacao+Rubrica, filtros (captacaoId, rubricaId, periodo, q), sort, paginação
- [x] 1.4 Implementar `ListarImpactoPendentesAsync` — GROUP BY ISRC/ISWC com COUNT DISTINCT captacaoId, inclui detalhes de captações afetadas
- [x] 1.5 Implementar `ListarPendentesComObraIdAsync` — pendentes com obraId != Guid.Empty (para worker)
- [x] 1.6 Implementar `ListarPendentesPorIdentificadorAsync` — por ISRC ou ISWC (para resolução em lote)

## Sequenciamento

- Bloqueado por: Nenhum (F02 já existe)
- Desbloqueia: 2.0, 3.0
- Paralelizável: Sim (com 5.0 e 6.0)

## Detalhes de Implementação

**Execucao.Resolver():**
```csharp
public void Resolver(Guid obraId, Guid? fonogramaId, string obraTitulo,
    string? fonogramaIsrc, string? obraIswc, string interpretes)
{
    if (Status != StatusExecucao.Pendente)
        throw new DomainException("Execução já está identificada.");
    ObraId = obraId;
    FonogramaId = fonogramaId;
    ObraTitulo = obraTitulo;
    FonogramaIsrc = fonogramaIsrc;
    ObraIswc = obraIswc;
    Interpretes = interpretes;
    Status = StatusExecucao.Identificada;
    AtualizadoEm = DateTime.UtcNow;
}
```

**ListarImpactoPendentesAsync — query:**
```csharp
var query = _context.Execucoes
    .Where(e => e.Status == StatusExecucao.Pendente)
    .GroupBy(e => new {
        Identificador = e.FonogramaIsrc ?? e.ObraIswc ?? "desconhecido",
        Tipo = e.FonogramaIsrc != null ? "isrc" : e.ObraIswc != null ? "iswc" : "desconhecido"
    })
    .Select(g => new ImpactoPendenteDto(
        g.Key.Identificador, g.Key.Tipo,
        g.Max(e => e.ObraTitulo),
        g.Count(),
        g.Select(e => e.CaptacaoId).Distinct().Count(),
        // Captações detalhadas carregadas em segundo step
        new List<CaptacaoImpactoDto>()
    ));
```

**Nota:** A lista de captações por impacto pode ser carregada via segundo query no handler (evitar GROUP BY complexo demais no EF Core).

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Método Resolver() transiciona PENDENTE → IDENTIFICADA
- [x] Resolver() em execução já IDENTIFICADA lança DomainException
- [x] ListarImpactoPendentesAsync agrupa corretamente por ISRC/ISWC
