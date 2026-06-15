using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Ocorrencias.Commands;

/// <summary>
/// Handler de assunção de análise de ocorrência pelo analista (RF-34, RF-37, RF-38).
/// <para>
/// Pipeline:
/// 1. Carrega a ocorrência via <c>GetByIdAsync</c> (AsNoTracking).
/// 2. <c>Ocorrencia.AssumirAnalise()</c> — valida <c>ABERTA</c> (RF-37: DomainException caso contrário).
/// 3. <c>Update</c> + <c>SaveChangesAsync</c> (AsNoTracking exige attach explícito).
/// 4. Log estruturado com scope <c>{OcorrenciaId}</c> + <c>{AnalistaId}</c> (RF-38).
/// </para>
/// </summary>
public class AnalisarOcorrenciaCommandHandler
    : ICommandHandler<AnalisarOcorrenciaCommand, OcorrenciaResponse>
{
    private readonly IOcorrenciaRepository _repo;
    private readonly ILogger<AnalisarOcorrenciaCommandHandler> _logger;

    public AnalisarOcorrenciaCommandHandler(
        IOcorrenciaRepository repo,
        ILogger<AnalisarOcorrenciaCommandHandler> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<OcorrenciaResponse> HandleAsync(
        AnalisarOcorrenciaCommand command, CancellationToken cancellationToken)
    {
        // RF-38: scope estruturado para correlação de logs (autor/data da análise).
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["OcorrenciaId"] = command.Id,
            ["AnalistaId"] = command.AnalistaId
        });

        // 1. Carregar ocorrência — GetByIdAsync usa AsNoTracking.
        var ocorrencia = await _repo.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("Ocorrencia", command.Id);

        // 2. Domínio valida ABERTA → EM_ANALISE (RF-37).
        ocorrencia.AssumirAnalise();

        // 3. Attach explícito (AsNoTracking): marca todas as props como Modified.
        _repo.Update(ocorrencia);
        await _repo.SaveChangesAsync(cancellationToken);

        // RF-38: loga quem assumiu a análise (a entidade não guarda DecisaoPor).
        _logger.LogInformation("Ocorrência analisada por {AnalistaId}", command.AnalistaId);

        return CriarOcorrenciaCommandHandler.MapToResponse(ocorrencia);
    }
}
