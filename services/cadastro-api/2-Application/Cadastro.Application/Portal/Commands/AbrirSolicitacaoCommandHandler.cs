using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de abertura de solicitação de alteração de dado sensível pelo titular autenticado
/// (RF-14, RF-15, RF-17, RF-20, RF-21).
/// <para>
/// Pipeline:
/// 1. Validação estrutural (FluentValidation) — campo válido, justificativa mínima, RF-20 defense in depth.
/// 2. Carrega titular via <see cref="ITitularRepository.GetByIdAsync"/> para capturar <c>ValorAtual</c>.
/// 3. Parse do <c>Campo</c> (string SCREAMING_SNAKE_CASE) para <see cref="CampoSolicitacao"/>.
/// 4. Captura <c>ValorAtual</c> do titular conforme o campo solicitado.
/// 5. <c>SolicitacaoAlteracao.Criar(...)</c> — o domínio força <c>Status = SOLICITADA</c> (RF-15)
///    e valida RF-20 (vínculo de associação só pode ser alterado, jamais removido).
/// 6. <c>_repo.AddAsync</c> + <c>_repo.SaveChangesAsync</c>.
/// 7. Retorna <see cref="SolicitacaoResponse"/> com flag <c>exigeAvisoJanela</c> (RF-21).
/// </para>
/// <para>
/// Não há evento outbox definido para abertura de solicitação no techspec (apenas
/// <c>cadastro.ocorrencia.aberta</c>/<c>cadastro.ocorrencia.resolvida</c> e
/// <c>cadastro.titular.contato.atualizado</c>). Logo, este handler não publica eventos.
/// </para>
/// </summary>
public class AbrirSolicitacaoCommandHandler : ICommandHandler<AbrirSolicitacaoCommand, SolicitacaoResponse>
{
    private readonly ISolicitacaoAlteracaoRepository _repo;
    private readonly ITitularRepository _titularRepository;
    private readonly IValidator<AbrirSolicitacaoCommand> _validator;
    private readonly ILogger<AbrirSolicitacaoCommandHandler> _logger;

    public AbrirSolicitacaoCommandHandler(
        ISolicitacaoAlteracaoRepository repo,
        ITitularRepository titularRepository,
        IValidator<AbrirSolicitacaoCommand> validator,
        ILogger<AbrirSolicitacaoCommandHandler> logger)
    {
        _repo = repo;
        _titularRepository = titularRepository;
        _validator = validator;
        _logger = logger;
    }

    public async Task<SolicitacaoResponse> HandleAsync(
        AbrirSolicitacaoCommand command, CancellationToken cancellationToken)
    {
        // 1. Validação estrutural — formato algorítmico e RF-20 defense in depth.
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = command.TitularId });

        // 2. Carrega titular (AsNoTracking — somente leitura para captura de ValorAtual).
        var titular = await _titularRepository.GetByIdAsync(command.TitularId, cancellationToken)
            ?? throw new NotFoundException("Titular", command.TitularId);

        // 3. Parse do Campo string (SCREAMING_SNAKE_CASE) para enum.
        var campo = ParseCampo(command.Campo);

        // 4. Captura ValorAtual do titular conforme o campo solicitado.
        var valorAtual = CapturarValorAtual(titular, campo);

        // 5. Domínio: SolicitacaoAlteracao.Criar força Status = SOLICITADA (RF-15) e valida RF-20.
        var solicitacao = SolicitacaoAlteracao.Criar(
            command.TitularId,
            campo,
            valorAtual,
            command.ValorPretendido,
            command.Justificativa);

        // 6. Persistência.
        await _repo.AddAsync(solicitacao, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Solicitação de alteração {SolicitacaoId} aberta via Portal", solicitacao.Id);

        return MapToResponse(solicitacao);
    }

    internal static SolicitacaoResponse MapToResponse(SolicitacaoAlteracao s) => new(
        Id: s.Id,
        Campo: FormatCampo(s.Campo),
        ValorAtual: s.ValorAtual,
        ValorPretendido: s.ValorPretendido,
        Justificativa: s.Justificativa,
        Status: FormatStatus(s.Status),
        DecididaEm: s.DecididaEm,
        JustificativaRejeicao: s.JustificativaRejeicao,
        ExigeAvisoJanela: s.Campo == CampoSolicitacao.Associacao);

    /// <summary>
    /// Converte string SCREAMING_SNAKE_CASE para <see cref="CampoSolicitacao"/>.
    /// O valor já foi pré-validado pelo <see cref="AbrirSolicitacaoCommandValidator"/>,
    /// mas mantemos fallback defensivo.
    /// </summary>
    private static CampoSolicitacao ParseCampo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new Cadastro.Application.Common.Exceptions.ValidationException(
                new Dictionary<string, string[]>
                {
                    ["Campo"] = ["Campo é obrigatório"]
                });
        }

        // CAE_IPI → CAEIPI exige remoção dos underscores antes do TryParse.
        var normalized = value.Replace("_", string.Empty);
        if (Enum.TryParse<CampoSolicitacao>(normalized, ignoreCase: true, out var campo))
        {
            return campo;
        }

        throw new Cadastro.Application.Common.Exceptions.ValidationException(
            new Dictionary<string, string[]>
            {
                ["Campo"] = [$"Campo inválido: '{value}'"]
            });
    }

    /// <summary>
    /// Captura o ValorAtual do titular conforme o campo solicitado.
    /// Mapeamento definido no techspec — <c>Categoria</c> não existe como campo próprio
    /// no Titular; usa <c>Tipo</c> (PF/PJ) como conceito mais próximo.
    /// </summary>
    private static string CapturarValorAtual(Domain.Entities.Titular titular, CampoSolicitacao campo) => campo switch
    {
        CampoSolicitacao.Nome => titular.Nome,
        CampoSolicitacao.CaeIpi => titular.CaeIpi?.Valor ?? string.Empty,
        CampoSolicitacao.Associacao => titular.AssociacaoId.ToString(),
        CampoSolicitacao.Categoria => titular.Tipo.ToString().ToUpperInvariant(),
        _ => throw new DomainException("Campo inválido")
    };

    /// <summary>Converte <see cref="CampoSolicitacao"/> para SCREAMING_SNAKE_CASE no response.</summary>
    internal static string FormatCampo(CampoSolicitacao campo) => campo switch
    {
        CampoSolicitacao.Nome        => "NOME",
        CampoSolicitacao.CaeIpi      => "CAE_IPI",
        CampoSolicitacao.Associacao  => "ASSOCIACAO",
        CampoSolicitacao.Categoria   => "CATEGORIA",
        _                            => campo.ToString().ToUpperInvariant()
    };

    /// <summary>Converte <see cref="StatusSolicitacao"/> para SCREAMING_SNAKE_CASE no response.</summary>
    internal static string FormatStatus(StatusSolicitacao status) => status switch
    {
        StatusSolicitacao.Solicitada => "SOLICITADA",
        StatusSolicitacao.Aprovada   => "APROVADA",
        StatusSolicitacao.Rejeitada  => "REJEITADA",
        _                            => status.ToString().ToUpperInvariant()
    };
}
