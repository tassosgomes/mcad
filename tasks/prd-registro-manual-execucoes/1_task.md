---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>cadastro/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 1.0: Cadastro API — Endpoint de Busca Unificada

## Relacionada aos Requisitos

- RF-01 — Buscar obra/fonograma no Cadastro (cobertura direta)
- RF-03 — Criar obra/fonograma pendente inline (suporte — usa endpoints existentes)

## Visão Geral

Criar um novo endpoint no Cadastro API (`GET /api/v1/busca`) que busca obras e fonogramas por ISRC, ISWC, título ou nome de titular em uma única chamada. Este endpoint é consumido pelo serviço de Identificação para resolver execuções. Adicionalmente, verificar que os endpoints existentes de criação (`POST /obras`, `POST /fonogramas`) permitem criação com status PENDENTE.

## Requisitos

- Endpoint `GET /api/v1/busca?q={termo}&tipo={obra|fonograma|todos}&size={20}`
- Busca por ISRC exato, ISWC exato, ILike em título, ILike em nome de titular
- Min 3 caracteres para busca por texto
- Retorna lista mista de obras e fonogramas com tipo discriminador
- Fonogramas incluem intérpretes (até 3 principais separados por `/`)
- Max 20 resultados por default (max 50)

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/BuscaEndpoints.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Busca/Queries/BuscaCadastroQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Busca/Queries/BuscaCadastroQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Busca/Responses/BuscaCadastroResponse.cs`
- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IObraRepository.cs` (adicionar `BuscarAsync`)
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IFonogramaRepository.cs` (adicionar `BuscarAsync`)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` (implementar `BuscarAsync`)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/FonogramaRepository.cs` (implementar `BuscarAsync`)
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (mapear `BuscaEndpoints`)
- **Referência:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` (padrão de busca existente `/busca`)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs` (padrão `BuscarParaAutocompleteAsync`)
  - `tasks/prd-registro-manual-execucoes/api-contract.yaml` (schema `BuscaCadastroResponse`)

## Subtarefas

- [x] 1.1 Criar `BuscaCadastroResponse` e `ResultadoBuscaDto` (record DTOs)
- [x] 1.2 Criar `BuscaCadastroQuery` e `BuscaCadastroQueryHandler` — busca em obras + fonogramas + titulares
- [x] 1.3 Adicionar `BuscarAsync(string termo, int limit, CancellationToken ct)` em `IObraRepository` e implementar em `ObraRepository` (ILike título + ISWC exato)
- [x] 1.4 Adicionar `BuscarAsync` em `IFonogramaRepository` e implementar em `FonogramaRepository` (ILike título + ISRC exato + join com titulares/intérpretes)
- [x] 1.5 Criar `BuscaEndpoints.cs` — `GET /api/v1/busca` com query params `q`, `tipo`, `size`
- [x] 1.6 Mapear endpoints no `Program.cs`
- [x] 1.7 Testar: busca por ISRC retorna fonograma, busca por título retorna obras e fonogramas

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 3.0 (CadastroHttpClient na Identificação precisa deste endpoint)
- Paralelizável: Sim (independente das tasks de Identificação)

## Detalhes de Implementação

**BuscaCadastroQueryHandler — lógica de busca:**
```csharp
public async Task<BuscaCadastroResponse> HandleAsync(BuscaCadastroQuery query, CancellationToken ct)
{
    if (query.Q.Length < 3)
        throw new ValidationException("O termo de busca deve ter no mínimo 3 caracteres");

    var resultados = new List<ResultadoBuscaDto>();

    if (query.Tipo is "todos" or "obra")
    {
        var obras = await _obraRepo.BuscarAsync(query.Q, query.Size, ct);
        resultados.AddRange(obras.Select(o => new ResultadoBuscaDto(
            Tipo: "obra", Id: o.Id, ObraId: null,
            Titulo: o.Titulo, Isrc: null, Iswc: o.Iswc,
            Interpretes: null, Status: o.Status.ToString().ToUpper())));
    }

    if (query.Tipo is "todos" or "fonograma")
    {
        var fonogramas = await _fonogramaRepo.BuscarAsync(query.Q, query.Size, ct);
        resultados.AddRange(fonogramas.Select(f => new ResultadoBuscaDto(
            Tipo: "fonograma", Id: f.Id, ObraId: f.ObraMusicalId,
            Titulo: f.ObraMusical.Titulo, Isrc: f.Isrc,
            Iswc: f.ObraMusical.Iswc,
            Interpretes: FormatarInterpretes(f.ParticipacoesConexas),
            Status: f.Status.ToString().ToUpper())));
    }

    return new BuscaCadastroResponse(resultados.Take(query.Size));
}

private static string FormatarInterpretes(IEnumerable<ParticipacaoConexa> participacoes)
{
    return string.Join(" / ", participacoes
        .Where(p => p.Categoria == CategoriaConexo.INTERPRETE)
        .Take(3)
        .Select(p => p.Titular.Nome));
}
```

**ObraRepository.BuscarAsync:**
```csharp
public async Task<IEnumerable<ObraMusical>> BuscarAsync(string termo, int limit, CancellationToken ct)
{
    var query = _context.ObrasMusicais.AsNoTracking();

    // ISWC exato
    if (termo.StartsWith("T-", StringComparison.OrdinalIgnoreCase))
        query = query.Where(o => o.Iswc == termo);
    else
        // ILike em título + join com titulares
        query = query.Where(o =>
            EF.Functions.ILike(o.Titulo, $"%{termo}%") ||
            o.TitularidadesAutorais.Any(t => EF.Functions.ILike(t.Titular.Nome, $"%{termo}%")));

    return await query.Take(limit).ToListAsync(ct);
}
```

**FonogramaRepository.BuscarAsync:**
```csharp
public async Task<IEnumerable<Fonograma>> BuscarAsync(string termo, int limit, CancellationToken ct)
{
    var query = _context.Fonogramas
        .AsNoTracking()
        .Include(f => f.ObraMusical)
        .Include(f => f.ParticipacoesConexas)
            .ThenInclude(p => p.Titular);

    // ISRC exato (12 chars alfanumérico)
    if (termo.Length == 12 && termo.All(char.IsLetterOrDigit))
        query = query.Where(f => f.Isrc == termo);
    else
        query = query.Where(f =>
            EF.Functions.ILike(f.ObraMusical.Titulo, $"%{termo}%") ||
            EF.Functions.ILike(f.Isrc ?? "", $"%{termo}%") ||
            f.ParticipacoesConexas.Any(p => EF.Functions.ILike(p.Titular.Nome, $"%{termo}%")));

    return await query.Take(limit).ToListAsync(ct);
}
```

**BuscaEndpoints.cs:**
```csharp
public static void MapBuscaEndpoints(this IEndpointRouteBuilder app)
{
    var group = app.MapGroup("/api/v1/busca").WithTags("Busca");

    group.MapGet("/", async ([AsParameters] BuscaCadastroQuery query, IDispatcher dispatcher, CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(query, ct);
        return Results.Ok(result);
    })
    .RequireAuthorization("read");
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/cadastro-api && dotnet build`
- [ ] GET busca por ISRC: `curl "http://localhost:5001/api/v1/busca?q=BRUM71500001"` → 200 com fonograma
- [ ] GET busca por título: `curl "http://localhost:5001/api/v1/busca?q=Meu%20Bem"` → 200 com obras e fonogramas
- [ ] GET busca com < 3 chars: `curl "http://localhost:5001/api/v1/busca?q=ab"` → 400
- [ ] GET busca com tipo=obra: retorna apenas obras
- [ ] Fonogramas incluem campo `interpretes` com até 3 nomes separados por `/`
