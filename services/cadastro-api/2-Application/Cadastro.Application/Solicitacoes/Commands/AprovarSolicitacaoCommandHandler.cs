using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Metrics;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Solicitacoes.Commands;

/// <summary>
/// Handler de aprovação de solicitação de alteração de dado sensível pelo Analista
/// (RF-16, RF-18).
/// <para>
/// Pipeline:
/// 1. Carrega <c>SolicitacaoAlteracao</c> (AsNoTracking) — se não existe, <c>NotFoundException</c>.
/// 2. Carrega <c>Titular</c> (tracked) via <c>GetByIdForUpdateAsync</c>.
/// 3. <c>solicitacao.Aprovar(analistaId)</c> — transição de estado (state machine valida).
/// 4. Aplica efeito colateral no titular conforme <c>Campo</c>:
///    - NOME → atualiza nome.
///    - CAE_IPI → parse e atualiza CAE/IPI (revalida VO).
///    - ASSOCIACAO → valida associação de destino e troca <c>AssociacaoId</c>.
///    - CATEGORIA → sem efeito colateral (Tipo é imutável — RF-11).
/// 5. Audit publisher registra diff before/after no titular (RF-18).
/// 6. <c>SaveChangesAsync</c> atômico (solicitação + titular + audit).
/// </para>
/// </summary>
public class AprovarSolicitacaoCommandHandler : ICommandHandler<AprovarSolicitacaoCommand, SolicitacaoResponse>
{
    private readonly ISolicitacaoAlteracaoRepository _solicitacaoRepo;
    private readonly ITitularRepository _titularRepo;
    private readonly IAssociacaoRepository _associacaoRepo;
    private readonly ITitularAuditPublisher _auditPublisher;
    private readonly ILogger<AprovarSolicitacaoCommandHandler> _logger;

    public AprovarSolicitacaoCommandHandler(
        ISolicitacaoAlteracaoRepository solicitacaoRepo,
        ITitularRepository titularRepo,
        IAssociacaoRepository associacaoRepo,
        ITitularAuditPublisher auditPublisher,
        ILogger<AprovarSolicitacaoCommandHandler> logger)
    {
        _solicitacaoRepo = solicitacaoRepo;
        _titularRepo = titularRepo;
        _associacaoRepo = associacaoRepo;
        _auditPublisher = auditPublisher;
        _logger = logger;
    }

    public async Task<SolicitacaoResponse> HandleAsync(
        AprovarSolicitacaoCommand command, CancellationToken cancellationToken)
    {
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["SolicitacaoId"] = command.Id,
            ["AnalistaId"] = command.AnalistaId
        });

        // 1. Carregar solicitação (AsNoTracking — será attachada via Update).
        var solicitacao = await _solicitacaoRepo.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("SolicitacaoAlteracao", command.Id);

        // 2. Carregar titular COM rastreamento para que o EF Core detecte as mutações.
        var titular = await _titularRepo.GetByIdForUpdateAsync(solicitacao.TitularId, cancellationToken)
            ?? throw new NotFoundException("Titular", solicitacao.TitularId);

        // 3. Transição de estado — o domínio valida SOLICITADA → APROVADA (RF-16).
        solicitacao.Aprovar(command.AnalistaId);

        // 4. Capturar snapshot before para auditoria (RF-18).
        var before = _auditPublisher.Snapshot(titular);

        // 5. Aplicar efeito colateral no titular conforme o Campo (RF-16).
        await AplicarEfeitoColateralAsync(titular, solicitacao, cancellationToken);

        // 6. Attach da solicitação detracked (AsNoTracking) para persistir o novo Status.
        _solicitacaoRepo.Update(solicitacao);

        // 7. Auditoria two-tier: registra diff before/after (RF-18).
        await _auditPublisher.PublishAsync(
            titular,
            TitularAuditOperation.AprovacaoSolicitacao,
            before,
            cancellationToken);

        // 8. SaveChanges atômico — solicitação + titular + audit no mesmo commit.
        await _solicitacaoRepo.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Solicitação {SolicitacaoId} aprovada por {AnalistaId}. Campo: {Campo}",
            command.Id, command.AnalistaId, solicitacao.Campo);
        PortalMetrics.IncrementSolicitacaoAprovada();

        return AbrirSolicitacaoCommandHandler.MapToResponse(solicitacao);
    }

    private async Task AplicarEfeitoColateralAsync(
        Titular titular,
        SolicitacaoAlteracao solicitacao,
        CancellationToken cancellationToken)
    {
        switch (solicitacao.Campo)
        {
            case CampoSolicitacao.Nome:
                titular.Atualizar(
                    solicitacao.ValorPretendido,
                    titular.Nacionalidade,
                    titular.AssociacaoId,
                    titular.Status,
                    titular.CaeIpi);
                break;

            case CampoSolicitacao.CaeIpi:
                var caeIpi = CaeIpi.Create(solicitacao.ValorPretendido);
                titular.Atualizar(
                    titular.Nome,
                    titular.Nacionalidade,
                    titular.AssociacaoId,
                    titular.Status,
                    caeIpi);
                break;

            case CampoSolicitacao.Associacao:
                if (!Guid.TryParse(solicitacao.ValorPretendido, out var novaAssociacaoId))
                    throw new DomainException("Valor pretendido para ASSOCIACAO deve ser um GUID válido");

                _ = await _associacaoRepo.GetByIdAsync(novaAssociacaoId, cancellationToken)
                    ?? throw new DomainException($"Associação com ID '{novaAssociacaoId}' não existe");

                titular.Atualizar(
                    titular.Nome,
                    titular.Nacionalidade,
                    novaAssociacaoId,
                    titular.Status,
                    titular.CaeIpi);
                break;

            case CampoSolicitacao.Categoria:
                // Tipo é imutável (RF-11) — a solicitação é aprovada mas sem efeito colateral.
                _logger.LogWarning(
                    "Solicitação {SolicitacaoId} aprovada para CATEGORIA sem efeito colateral — Tipo é imutável",
                    solicitacao.Id);
                break;

            default:
                throw new DomainException($"Campo de solicitação não suportado: {solicitacao.Campo}");
        }
    }
}
