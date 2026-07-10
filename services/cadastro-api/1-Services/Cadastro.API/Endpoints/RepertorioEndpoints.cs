using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Repertorios;
using Cadastro.Application.Repertorios.Commands;
using Cadastro.Application.Repertorios.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class RepertorioEndpoints
{
    public static void MapRepertorioEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/repertorios").WithTags("Repertorios");

        group.MapGet("/titulares", async (string? documento, IDispatcher dispatcher, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(documento))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["documento"] = ["O parâmetro documento é obrigatório."]
                });
            }

            var result = await dispatcher.QueryAsync(new BuscarTitularPorDocumentoQuery(documento), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.RepertorioCriar);

        group.MapPost("/", async ([FromBody] RegistrarRepertorioRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new RegistrarRepertorioCommand(
                request.Obra,
                request.Titulares,
                request.Titularidades,
                request.Fonogramas,
                SalvarComoPendente: false);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/obras/{result.ObraId}", result);
        })
        .RequireCadastroPermission(CadastroPermissions.RepertorioCriar);

        group.MapPost("/pendentes", async ([FromBody] RegistrarRepertorioRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new RegistrarRepertorioCommand(
                request.Obra,
                request.Titulares,
                request.Titularidades,
                request.Fonogramas,
                SalvarComoPendente: true);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/obras/{result.ObraId}", result);
        })
        .RequireCadastroPermission(CadastroPermissions.RepertorioCriar);
    }
}

public record RegistrarRepertorioRequest(
    DadosObraRepertorio Obra,
    IReadOnlyCollection<TitularRepertorioInput> Titulares,
    IReadOnlyCollection<TitularidadeRepertorioInput> Titularidades,
    IReadOnlyCollection<FonogramaRepertorioInput> Fonogramas);
