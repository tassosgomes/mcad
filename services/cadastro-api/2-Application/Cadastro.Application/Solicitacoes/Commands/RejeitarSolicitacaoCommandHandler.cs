using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Solicitacoes.Commands;

/// <summary>
/// Handler de rejeição de solicitação de alteração pelo Analista (RF-19).
/// <para>
/// Pipeline:
/// 1. Carrega <c>SolicitacaoAlteracao</c> (AsNoTracking).
/// 2. <c>solicitacao.Rejeitar(analistaId, justificativa)</c> — transição de estado.
/// 3. <c>Update</c> + <c>SaveChangesAsync</c>.
/// </para>
/// <para>
/// Sem efeito colateral no titular — a rejeição apenas registra justificativa.
/// </para>
/// </summary>
public class RejeitarSolicitacaoCommandHandler : ICommandHandler<RejeitarSolicitacaoCommand, SolicitacaoResponse>
{
    private readonly ISolicitacaoAlteracaoRepository _repo;
    private readonly ILogger<RejeitarSolicitacaoCommandHandler> _logger;

    public RejeitarSolicitacaoCommandHandler(
        ISolicitacaoAlteracaoRepository repo,
        ILogger<RejeitarSolicitacaoCommandHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<SolicitacaoResponse> HandleAsync(
        RejeitarSolicitacaoCommand command, CancellationToken cancellationToken)
    {
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["SolicitacaoId"] = command.Id,
            ["AnalistaId"] = command.AnalistaId
        });

        // 1. Carregar solicitação (AsNoTracking).
        var solicitacao = await _repo.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("SolicitacaoAlteracao", command.Id);

        // 2. Domínio valida SOLICITADA → REJEITADA e registra justificativa (RF-19).
        solicitacao.Rejeitar(command.AnalistaId, command.JustificativaRejeicao);

        // 3. Attach explícito (AsNoTracking): marca todas as props como Modified.
        _repo.Update(solicitacao);
        await _repo.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Solicitação {SolicitacaoId} rejeitada por {AnalistaId}",
            command.Id, command.AnalistaId);

        return AbrirSolicitacaoCommandHandler.MapToResponse(solicitacao);
    }
}
