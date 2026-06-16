using Identificacao.Application.Common;
using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Identificacao.Application.Captacoes.Commands;

public class ReprocessarResponsaveisDesconhecidosCommandHandler
    : ICommandHandler<ReprocessarResponsaveisDesconhecidosCommand, ReprocessarResponsaveisResult>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IUsuarioIdentidadeRepository _usuarioRepo;
    private readonly ILogger<ReprocessarResponsaveisDesconhecidosCommandHandler> _logger;

    public ReprocessarResponsaveisDesconhecidosCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IUsuarioIdentidadeRepository usuarioRepo,
        ILogger<ReprocessarResponsaveisDesconhecidosCommandHandler> logger)
    {
        _captacaoRepo = captacaoRepo;
        _usuarioRepo = usuarioRepo;
        _logger = logger;
    }

    public async Task<ReprocessarResponsaveisResult> HandleAsync(
        ReprocessarResponsaveisDesconhecidosCommand command, CancellationToken ct)
    {
        var captacoes = await _captacaoRepo.ListarPorNomeResponsavelAsync("Desconhecido", ct);
        var usuarios = await _usuarioRepo.ListarTodosAsync(ct);

        var nomePorId = new Dictionary<Guid, string>();
        foreach (var u in usuarios)
        {
            var id = AnalistaIdentificador.FromSubject(u.LogtoUserId);
            nomePorId[id] = u.NomeExibicao;
        }

        var totalAnalisadas = captacoes.Count;
        var totalCorrigidas = 0;
        var semCorrespondencia = 0;

        foreach (var captacao in captacoes)
        {
            if (nomePorId.TryGetValue(captacao.AnalistaResponsavelId, out var nome))
            {
                captacao.ReatribuirNomeResponsavel(nome);
                totalCorrigidas++;
            }
            else
            {
                semCorrespondencia++;
                if (semCorrespondencia % 10 == 0)
                {
                    _logger.LogWarning(
                        "Captação {CaptacaoId} com responsável 'Desconhecido' sem correspondência na projeção",
                        captacao.Id);
                }
            }
        }

        if (totalAnalisadas > 0)
        {
            await _captacaoRepo.SaveChangesAsync(ct);
        }

        _logger.LogInformation(
            "Backfill concluído: {Analisadas} analisadas, {Corrigidas} corrigidas",
            totalAnalisadas, totalCorrigidas);

        return new ReprocessarResponsaveisResult(totalAnalisadas, totalCorrigidas);
    }
}
