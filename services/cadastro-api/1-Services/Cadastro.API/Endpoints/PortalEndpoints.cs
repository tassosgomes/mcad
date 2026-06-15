using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Queries;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares;
using Cadastro.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de dados do titular autenticado no Portal (RF-09 a RF-13).
/// Prefixo <c>/api/v1/portal</c>. Todos exigem token do scheme "Titular" (policy "PortalTitular").
/// <para>
/// Anti-tampering: <c>titularId</c> é sempre extraído de <c>ICurrentTitular</c> (JWT), nunca do body —
/// um titular não pode editar dados de outro.
/// </para>
/// </summary>
public static class PortalEndpoints
{
    public static void MapPortalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/portal")
            .RequireAuthorization("PortalTitular")
            .WithTags("Portal do Titular — Dados");

        // GET /api/v1/portal/me — dados básicos do titular autenticado (documento mascarado, LGPD).
        group.MapGet("/me", GetMe)
             .WithName("ObterMeuTitular")
             .WithSummary("Retorna os dados básicos do titular autenticado (documento mascarado)");

        // PUT /api/v1/portal/me/contato — atualiza endereço/telefone/e-mail (RF-09 a RF-13).
        group.MapPut("/me/contato", AtualizarContato)
             .WithName("AtualizarMeuContato")
             .WithSummary("Atualiza endereço, telefone e e-mail de contato do titular autenticado");

        // GET /api/v1/portal/minhas-obras — RF-22, RF-24, RF-25, RF-26.
        group.MapGet("/minhas-obras", GetMinhasObras)
             .WithName("ObterMinhasObras")
             .WithSummary("Lista as obras (titularidades autorais) do titular autenticado");

        // GET /api/v1/portal/meus-fonogramas — RF-23, RF-24, RF-25.
        group.MapGet("/meus-fonogramas", GetMeusFonogramas)
             .WithName("ObterMeusFonogramas")
             .WithSummary("Lista os fonogramas (participações conexas) do titular autenticado");
    }

    private static async Task<IResult> GetMe(
        [FromServices] ICurrentTitular currentTitular,
        [FromServices] ITitularRepository titularRepository,
        CancellationToken cancellationToken)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        var titular = await titularRepository.GetByIdAsync(currentTitular.TitularId, cancellationToken);
        if (titular is null)
        {
            return Results.NotFound();
        }

        // LGPD: titular vê o próprio documento mascarado (nunca o completo neste endpoint).
        var (documento, documentoFormatado) = DocumentoMasking.Apply(
            titular.Documento, titular.DocumentoFormatado, fullAllowed: false);

        ContatoResponse? contato = null;
        if (titular.Email is not null || titular.Endereco is not null || titular.Telefones.Count > 0)
        {
            EnderecoDto? enderecoDto = null;
            if (titular.Endereco is not null)
            {
                var e = titular.Endereco;
                enderecoDto = new EnderecoDto(
                    e.Cep.Valor,
                    e.Logradouro,
                    e.Numero,
                    e.Complemento,
                    e.Bairro,
                    e.Cidade,
                    e.Uf.Valor);
            }

            var telefonesDto = titular.Telefones
                .Select(t => new TelefoneDto(t.Tipo.ToString().ToUpperInvariant(), t.Numero.Valor))
                .ToList();

            contato = new ContatoResponse(titular.Email?.Valor, enderecoDto, telefonesDto);
        }

        var response = new MeuTitularResponse(
            titular.Id,
            titular.Nome,
            titular.Tipo.ToString().ToUpperInvariant(),
            documento,
            documentoFormatado,
            contato);

        return Results.Ok(response);
    }

    private static async Task<IResult> AtualizarContato(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        [FromBody] AtualizarContatoRequest request,
        CancellationToken cancellationToken)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // Anti-tampering: titularId vem do JWT (ICurrentTitular), nunca do body.
        var command = new AtualizarContatoCommand(
            currentTitular.TitularId,
            request.Email,
            request.Endereco,
            request.Telefones ?? []);

        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-22 / RF-24 / RF-25 / RF-26: consulta de repertório (somente leitura).
    // titularId NUNCA vem da query string — sempre do ICurrentTitular (JWT).
    // ──────────────────────────────────────────────────────────────────────────

    private static async Task<IResult> GetMinhasObras(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        CancellationToken cancellationToken,
        int page = 1,
        int size = 20,
        string? filtro = null,
        string? sort = "titulo")
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-24: titularId extraído do token — o cliente não pode informar o seu próprio.
        var query = new ObterMinhasObrasQuery(
            TitularId: currentTitular.TitularId,
            Page: page,
            Size: size,
            Filtro: filtro,
            Sort: sort);

        var result = await dispatcher.QueryAsync(query, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetMeusFonogramas(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        CancellationToken cancellationToken,
        int page = 1,
        int size = 20,
        string? filtro = null,
        string? sort = "titulo")
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-24: titularId extraído do token — o cliente não pode informar o seu próprio.
        var query = new ObterMeusFonogramasQuery(
            TitularId: currentTitular.TitularId,
            Page: page,
            Size: size,
            Filtro: filtro,
            Sort: sort);

        var result = await dispatcher.QueryAsync(query, cancellationToken);
        return Results.Ok(result);
    }
}

/// <summary>Body da atualização de contato (RF-09). TitularId vem do token, não do body.</summary>
public record AtualizarContatoRequest(
    string? Email,
    EnderecoDto? Endereco,
    IReadOnlyList<TelefoneDto>? Telefones);
