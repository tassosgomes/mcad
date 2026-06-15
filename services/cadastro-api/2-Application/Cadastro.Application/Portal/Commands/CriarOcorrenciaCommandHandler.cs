using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de abertura de ocorrência pelo titular autenticado (RF-27 a RF-32).
/// <para>
/// Pipeline:
/// 1. Validação estrutural (FluentValidation) — tipo válido, descrição com mín. 10 chars.
/// 2. Parse do <c>Tipo</c> (string SCREAMING_SNAKE_CASE) para <see cref="TipoOcorrencia"/>.
/// 3. <c>Ocorrencia.Criar(...)</c> — o domínio força <c>Status = ABERTA</c> (RF-28).
/// 4. <c>_repo.AddAsync</c>.
/// 5. Evento outbox <c>cadastro.ocorrencia.aberta</c> (RF-32) — string literal
///    (não constante de Infra) para respeitar Clean Architecture (Application não referencia Infra).
/// 6. <c>_repo.SaveChangesAsync</c> atômico (entidade + outbox no mesmo SaveChanges).
/// </para>
/// </summary>
public class CriarOcorrenciaCommandHandler : ICommandHandler<CriarOcorrenciaCommand, OcorrenciaResponse>
{
    private const string EventTypeOcorrenciaAberta = "cadastro.ocorrencia.aberta";

    private readonly IOcorrenciaRepository _repo;
    private readonly IValidator<CriarOcorrenciaCommand> _validator;
    private readonly IOutboxEventWriter _outbox;
    private readonly ILogger<CriarOcorrenciaCommandHandler> _logger;

    public CriarOcorrenciaCommandHandler(
        IOcorrenciaRepository repo,
        IValidator<CriarOcorrenciaCommand> validator,
        IOutboxEventWriter outbox,
        ILogger<CriarOcorrenciaCommandHandler> logger)
    {
        _repo = repo;
        _validator = validator;
        _outbox = outbox;
        _logger = logger;
    }

    public async Task<OcorrenciaResponse> HandleAsync(
        CriarOcorrenciaCommand command, CancellationToken cancellationToken)
    {
        // 1. Validação estrutural — formato algorítmico fica no domínio (Descricao cap 2000 no validator).
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = command.TitularId });

        // 2. Parse do Tipo string (SCREAMING_SNAKE_CASE) para enum.
        var tipo = ParseTipo(command.Tipo);

        // 3. Domínio: Ocorrencia.Criar força Status = ABERTA (RF-28).
        var ocorrencia = Ocorrencia.Criar(
            command.TitularId,
            tipo,
            command.Descricao,
            command.ObraId,
            command.FonogramaId);

        // 4. Persistência inicial (rastreamento para o EF Core).
        await _repo.AddAsync(ocorrencia, cancellationToken);

        // 5. Evento outbox — atômico com SaveChanges (RF-32).
        //    String literal (não constante de Infra) para respeitar Clean Architecture:
        //    Application não referencia Infra. O valor bate com EventTypes.OcorrenciaAberta.
        _outbox.AddEvent(
            EventTypeOcorrenciaAberta,
            ocorrencia.Id.ToString(),
            new
            {
                ocorrenciaId = ocorrencia.Id,
                titularId = ocorrencia.TitularId,
                tipo = FormatTipo(ocorrencia.Tipo),
                obraId = ocorrencia.ObraId,
                fonogramaId = ocorrencia.FonogramaId,
                descricao = ocorrencia.Descricao,
                abertaEm = ocorrencia.AbertaEm
            });

        // 6. Persistência atômica (entidade + outbox no mesmo SaveChanges).
        await _repo.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Ocorrência {OcorrenciaId} aberta via Portal", ocorrencia.Id);

        return MapToResponse(ocorrencia);
    }

    internal static OcorrenciaResponse MapToResponse(Ocorrencia o) => new(
        Id: o.Id,
        Tipo: FormatTipo(o.Tipo),
        ObraId: o.ObraId,
        FonogramaId: o.FonogramaId,
        Descricao: o.Descricao,
        Status: FormatStatus(o.Status),
        Resolucao: o.Resolucao,
        AbertaEm: o.AbertaEm,
        ResolvidaEm: o.ResolvidaEm);

    /// <summary>
    /// Converte string SCREAMING_SNAKE_CASE para <see cref="TipoOcorrencia"/>.
    /// Valor já foi pré-validado pelo <see cref="CriarOcorrenciaCommandValidator"/>,
    /// mas mantemos fallback defensivo para evitar <c>ArgumentException</c> silencioso.
    /// </summary>
    private static TipoOcorrencia ParseTipo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new Cadastro.Application.Common.Exceptions.ValidationException(
                new Dictionary<string, string[]>
                {
                    ["Tipo"] = ["Tipo é obrigatório"]
                });
        }

        // EmAnalise → EM_ANALISE exige remoção dos underscores antes do TryParse.
        var normalized = value.Replace("_", string.Empty);
        if (Enum.TryParse<TipoOcorrencia>(normalized, ignoreCase: true, out var tipo))
        {
            return tipo;
        }

        throw new Cadastro.Application.Common.Exceptions.ValidationException(
            new Dictionary<string, string[]>
            {
                ["Tipo"] = [$"Tipo inválido: '{value}'"]
            });
    }

    /// <summary>Converte <see cref="TipoOcorrencia"/> para SCREAMING_SNAKE_CASE no response.</summary>
    internal static string FormatTipo(TipoOcorrencia tipo) => tipo switch
    {
        TipoOcorrencia.TitularidadeDivergente => "TITULARIDADE_DIVERGENTE",
        TipoOcorrencia.FonogramaIncorreto     => "FONOGRAMA_INCORRETO",
        TipoOcorrencia.DadoCadastral          => "DADO_CADASTRAL",
        TipoOcorrencia.ObraAusente            => "OBRA_AUSENTE",
        _                                     => tipo.ToString().ToUpperInvariant()
    };

    /// <summary>Converte <see cref="StatusOcorrencia"/> para SCREAMING_SNAKE_CASE no response.</summary>
    internal static string FormatStatus(StatusOcorrencia status) => status switch
    {
        StatusOcorrencia.Aberta    => "ABERTA",
        StatusOcorrencia.EmAnalise => "EM_ANALISE",
        StatusOcorrencia.Resolvida => "RESOLVIDA",
        StatusOcorrencia.Cancelada => "CANCELADA",
        _                          => status.ToString().ToUpperInvariant()
    };
}
