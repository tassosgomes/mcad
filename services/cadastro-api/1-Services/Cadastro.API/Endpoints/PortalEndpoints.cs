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

        // POST /api/v1/portal/ocorrencias — RF-27, RF-28, RF-32.
        group.MapPost("/ocorrencias", CriarOcorrencia)
             .WithName("CriarOcorrencia")
             .WithSummary("Abre uma nova ocorrência (nasce ABERTA) para o titular autenticado");

        // GET /api/v1/portal/ocorrencias — RF-29, RF-30, RF-31.
        group.MapGet("/ocorrencias", ListarMinhasOcorrencias)
             .WithName("ListarMinhasOcorrencias")
             .WithSummary("Lista as ocorrências do titular autenticado (com filtro opcional por status)");

        // POST /api/v1/portal/solicitacoes-alteracao — RF-14, RF-15, RF-20, RF-21.
        group.MapPost("/solicitacoes-alteracao", AbrirSolicitacaoAlteracao)
             .WithName("AbrirSolicitacaoAlteracao")
             .WithSummary("Abre uma nova solicitação de alteração de dado sensível (nasce SOLICITADA)");

        // GET /api/v1/portal/solicitacoes-alteracao — RF-17.
        group.MapGet("/solicitacoes-alteracao", ListarMinhasSolicitacoes)
             .WithName("ListarMinhasSolicitacoesAlteracao")
             .WithSummary("Lista as solicitações de alteração do titular autenticado (com filtro opcional por status)");
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

    // ──────────────────────────────────────────────────────────────────────────
    // RF-27 a RF-32: abertura e listagem de ocorrências pelo titular.
    // titularId NUNCA vem da query string/body — sempre do ICurrentTitular (JWT).
    // ──────────────────────────────────────────────────────────────────────────

    private static async Task<IResult> CriarOcorrencia(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        [FromBody] CriarOcorrenciaRequest request,
        CancellationToken cancellationToken)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-31: anti-tampering — titularId vem do JWT, nunca do body.
        var command = new CriarOcorrenciaCommand(
            TitularId: currentTitular.TitularId,
            Tipo: request.Tipo,
            ObraId: request.ObraId,
            FonogramaId: request.FonogramaId,
            Descricao: request.Descricao);

        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Created($"/api/v1/portal/ocorrencias/{result.Id}", result);
    }

    private static async Task<IResult> ListarMinhasOcorrencias(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        CancellationToken cancellationToken,
        string? status = null,
        int page = 1,
        int size = 20)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-31: titularId extraído do token — o cliente não pode informar o seu próprio.
        var query = new ListarMinhasOcorrenciasQuery(
            TitularId: currentTitular.TitularId,
            Status: status,
            Page: page,
            Size: size);

        var result = await dispatcher.QueryAsync(query, cancellationToken);
        return Results.Ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-14, RF-15, RF-17, RF-20, RF-21: abertura e listagem de solicitações de
    // alteração de dado sensível pelo titular. Aprovação/rejeição fica na task 12.0.
    // titularId NUNCA vem da query string/body — sempre do ICurrentTitular (JWT).
    // ──────────────────────────────────────────────────────────────────────────

    private static async Task<IResult> AbrirSolicitacaoAlteracao(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        [FromBody] AbrirSolicitacaoRequest request,
        CancellationToken cancellationToken)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-17: anti-tampering — titularId vem do JWT, nunca do body.
        var command = new AbrirSolicitacaoCommand(
            TitularId: currentTitular.TitularId,
            Campo: request.Campo,
            ValorPretendido: request.ValorPretendido,
            Justificativa: request.Justificativa);

        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Created($"/api/v1/portal/solicitacoes-alteracao/{result.Id}", result);
    }

    private static async Task<IResult> ListarMinhasSolicitacoes(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        CancellationToken cancellationToken,
        string? status = null,
        int page = 1,
        int size = 20)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        // RF-17: titularId extraído do token — o cliente não pode informar o seu próprio.
        var query = new ListarMinhasSolicitacoesQuery(
            TitularId: currentTitular.TitularId,
            Status: status,
            Page: page,
            Size: size);

        var result = await dispatcher.QueryAsync(query, cancellationToken);
        return Results.Ok(result);
    }
}

/// <summary>Body da atualização de contato (RF-09). TitularId vem do token, não do body.</summary>
public record AtualizarContatoRequest(
    string? Email,
    EnderecoDto? Endereco,
    IReadOnlyList<TelefoneDto>? Telefones);

/// <summary>
/// Body da abertura de ocorrência (RF-27). TitularId vem do token, não do body.
/// <c>Tipo</c> em SCREAMING_SNAKE_CASE (ex: <c>TITULARIDADE_DIVERGENTE</c>).
/// </summary>
public record CriarOcorrenciaRequest(
    string Tipo,
    Guid? ObraId,
    Guid? FonogramaId,
    string Descricao);

/// <summary>
/// Body da abertura de solicitação de alteração (RF-14). TitularId vem do token, não do body.
/// <c>Campo</c> em SCREAMING_SNAKE_CASE (<c>NOME</c>, <c>CAE_IPI</c>, <c>ASSOCIACAO</c>, <c>CATEGORIA</c>).
/// Quando <c>Campo == ASSOCIACAO</c>, <c>ValorPretendido</c> deve ser o GUID da nova associação (RF-20).
/// </summary>
public record AbrirSolicitacaoRequest(
    string Campo,
    string ValorPretendido,
    string Justificativa);
