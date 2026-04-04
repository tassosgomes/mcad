using Identificacao.Application.Pendentes.Commands;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identificacao.Application.Pendentes.Services;

public class PendentesVerificadorWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PendentesVerificadorWorker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public PendentesVerificadorWorker(IServiceProvider serviceProvider, ILogger<PendentesVerificadorWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await VerificaoPendentesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro na re-verificação automática de pendentes.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task VerificaoPendentesAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var execucaoRepo = scope.ServiceProvider.GetRequiredService<IExecucaoRepository>();
        var cadastroHttpClient = scope.ServiceProvider.GetRequiredService<ICadastroHttpClient>();

        var pendentes = await execucaoRepo.ListarPendentesComObraIdAsync(ct);
        if (!pendentes.Any()) return;

        var obrasIds = pendentes.Select(x => x.ObraId).Distinct().ToList();

        foreach (var obraId in obrasIds)
        {
            var obra = await cadastroHttpClient.GetObraByIdAsync(obraId, ct);
            if (obra != null && obra.Status == "LIBERADO")
            {
                var execucoesObra = pendentes.Where(e => e.ObraId == obraId).ToList();
                int resolvidas = 0;

                foreach (var pendente in execucoesObra)
                {
                    try
                    {
                        var fonograma = pendente.FonogramaId.HasValue 
                            ? await cadastroHttpClient.GetFonogramaByIdAsync(pendente.FonogramaId.Value, ct) 
                            : null;
                        
                        if (pendente.FonogramaId.HasValue && (fonograma == null || fonograma.Status != "LIBERADO"))
                            continue;

                        string titulo = fonograma?.Titulo ?? obra.Titulo;
                        string? isrc = fonograma?.Isrc;
                        string? iswc = obra.Iswc;
                        string interpretes = fonograma?.Interpretes ?? "";

                        pendente.Resolver(obraId, pendente.FonogramaId, titulo, isrc, iswc, interpretes);
                        resolvidas++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Falha ao auto-resolver execução {Id}", pendente.Id);
                    }
                }

                if (resolvidas > 0)
                {
                    _logger.LogInformation("Worker auto-resolveu {Resolvidas} execuções para obra {ObraId}.", resolvidas, obraId);
                    await execucaoRepo.SaveChangesAsync(ct);
                }
            }
        }
    }
}
