using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Ocorrencias.Commands;

/// <summary>
/// Handler de resolução de ocorrência pelo analista (RF-35, RF-37, RF-38, RF-39).
/// <para>
/// Pipeline:
/// 1. Carrega a ocorrência via <c>GetByIdAsync</c> (AsNoTracking).
/// 2. <c>Ocorrencia.Resolver(parecer)</c> — valida <c>EM_ANALISE</c> + parecer (RF-37).
/// 3. Publica evento outbox <c>cadastro.ocorrencia.resolvida</c> (RF-39).
/// 4. <c>Update</c> + <c>SaveChangesAsync</c> atômico (entidade + outbox).
/// 5. Log estruturado com scope <c>{OcorrenciaId}</c> + <c>{AnalistaId}</c> (RF-38).
/// </para>
/// </summary>
public class ResolverOcorrenciaCommandHandler
    : ICommandHandler<ResolverOcorrenciaCommand, OcorrenciaResponse>
{
    private const string EventTypeOcorrenciaResolvida = "cadastro.ocorrencia.resolvida";

    private readonly IOcorrenciaRepository _repo;
    private readonly IOutboxEventWriter _outbox;
    private readonly ILogger<ResolverOcorrenciaCommandHandler> _logger;

    public ResolverOcorrenciaCommandHandler(
        IOcorrenciaRepository repo,
        IOutboxEventWriter outbox,
        ILogger<ResolverOcorrenciaCommandHandler> logger)
    {
        _repo = repo;
        _outbox = outbox;
        _logger = logger;
    }

    public async Task<OcorrenciaResponse> HandleAsync(
        ResolverOcorrenciaCommand command, CancellationToken cancellationToken)
    {
        // RF-38: scope estruturado para correlação de logs (autor/data da resolução).
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["OcorrenciaId"] = command.Id,
            ["AnalistaId"] = command.AnalistaId
        });

        // 1. Carregar ocorrência — GetByIdAsync usa AsNoTracking.
        var ocorrencia = await _repo.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("Ocorrencia", command.Id);

        // 2. Domínio valida EM_ANALISE → RESOLVIDA + registra parecer (RF-37, RF-35).
        ocorrencia.Resolver(command.Parecer);

        // 3. Evento outbox — atômico com SaveChanges (RF-39).
        //    String literal (não constante de Infra) para respeitar Clean Architecture:
        //    Application não referencia Infra.
        _outbox.AddEvent(
            EventTypeOcorrenciaResolvida,
            ocorrencia.Id.ToString(),
            new
            {
                ocorrenciaId = ocorrencia.Id,
                titularId = ocorrencia.TitularId,
                resolucao = ocorrencia.Resolucao,
                resolvidaEm = ocorrencia.ResolvidaEm
            });

        // 4. Attach explícito (AsNoTracking): marca todas as props como Modified.
        _repo.Update(ocorrencia);
        await _repo.SaveChangesAsync(cancellationToken);

        // RF-38: loga quem resolveu a análise (a entidade não guarda DecisaoPor).
        _logger.LogInformation("Ocorrência resolvida por {AnalistaId}", command.AnalistaId);

        return CriarOcorrenciaCommandHandler.MapToResponse(ocorrencia);
    }
}
