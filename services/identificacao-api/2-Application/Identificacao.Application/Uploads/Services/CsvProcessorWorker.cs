using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identificacao.Application.Uploads.Services;

public class CsvProcessorWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CsvProcessorWorker> _logger;

    public CsvProcessorWorker(IServiceProvider serviceProvider, ILogger<CsvProcessorWorker> logger)
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
                using var scope = _serviceProvider.CreateScope();
                var uploadRepo = scope.ServiceProvider.GetRequiredService<IUploadRepository>();
                var pendentes = await uploadRepo.ListarPendentesAsync(stoppingToken);

                foreach (var upload in pendentes)
                {
                    await ProcessarUploadAsync(scope.ServiceProvider, upload, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Erro no CsvProcessorWorker");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private async Task ProcessarUploadAsync(IServiceProvider sp, Upload upload, CancellationToken ct)
    {
        var uploadRepo = sp.GetRequiredService<IUploadRepository>();
        var erroRepo = sp.GetRequiredService<IErroUploadRepository>();
        var captacaoRepo = sp.GetRequiredService<ICaptacaoRepository>();
        var execRepo = sp.GetRequiredService<IExecucaoRepository>();
        var minioService = sp.GetRequiredService<IMinioService>();
        var csvParser = sp.GetRequiredService<CsvParser>();
        var cadastroClient = sp.GetRequiredService<ICadastroHttpClient>();
        var tipoRepo = sp.GetRequiredService<ITipoUtilizacaoRepository>();

        try
        {
            var captacao = await captacaoRepo.GetByIdAsync(upload.CaptacaoId, ct);
            if (captacao == null || captacao.Status != StatusCaptacao.Aberta)
            {
                upload.MarcarErro("Captação fechada ou não encontrada.");
                await uploadRepo.SaveChangesAsync(ct);
                return;
            }

            // ExigeClassificacao => Rubrica = TV Aberta
            bool exigeClassificacao = captacao.Rubrica?.Nome?.Contains("TV Aberta", StringComparison.OrdinalIgnoreCase) ?? false;

            Stream stream;
            try
            {
                stream = await minioService.DownloadAsync(upload.MinioKey, ct);
            }
            catch (Exception)
            {
                upload.MarcarErro("Arquivo não encontrado no MinIO.");
                await uploadRepo.SaveChangesAsync(ct);
                return;
            }

            using var reader = new StreamReader(stream);
            var parseResult = csvParser.Parse(reader, exigeClassificacao);

            var listErrosUpload = new List<ErroUpload>();
            foreach (var erro in parseResult.Erros)
            {
                listErrosUpload.Add(ErroUpload.Criar(upload.Id, erro.Linha, erro.Coluna, erro.Mensagem));
            }

            if (parseResult.IsErroGlobal)
            {
                upload.MarcarErro(parseResult.MensagemErroGlobal!);
                await uploadRepo.SaveChangesAsync(ct);
                return;
            }

            var tipos = await tipoRepo.ListarAsync(ct);
            int execucoesAdicionadas = 0;

            foreach (var linha in parseResult.LinhasAgrupadas)
            {
                var query = !string.IsNullOrEmpty(linha.Isrc) ? linha.Isrc : linha.Iswc;
                var tp = !string.IsNullOrEmpty(linha.Isrc) ? "fonograma" : "obra";
                var buscaResp = await cadastroClient.BuscarAsync(query!, tp, 1, ct);

                var resultadoCadastro = buscaResp.Resultados.FirstOrDefault();
                if (resultadoCadastro == null)
                {
                    listErrosUpload.Add(ErroUpload.Criar(upload.Id, 0, tp == "fonograma" ? "isrc" : "iswc", $"Identificador não encontrado no Cadastro: {query}"));
                    continue;
                }

                Guid? tipoId = null;
                if (!string.IsNullOrEmpty(linha.TipoUtilizacao))
                {
                    var tipoMatch = tipos.FirstOrDefault(t => t.Sigla.Equals(linha.TipoUtilizacao, StringComparison.OrdinalIgnoreCase));
                    tipoId = tipoMatch?.Id;
                }

                var exec = Execucao.Criar(
                    captacaoId: upload.CaptacaoId,
                    obraId: resultadoCadastro.ObraId ?? resultadoCadastro.Id,
                    fonogramaId: tp == "fonograma" ? resultadoCadastro.Id : null,
                    obraTitulo: resultadoCadastro.Titulo,
                    fonogramaIsrc: resultadoCadastro.Isrc,
                    obraIswc: resultadoCadastro.Iswc,
                    interpretes: resultadoCadastro.Interpretes ?? "",
                    inicio: linha.Inicio,
                    fim: linha.Fim,
                    quantidade: linha.Quantidade,
                    tipoUtilizacaoId: tipoId,
                    tituloPrograma: linha.TituloPrograma,
                    status: StatusExecucao.Identificada
                );

                await execRepo.AddAsync(exec, ct);
                execucoesAdicionadas++;

                if (execucoesAdicionadas % 100 == 0)
                {
                    await execRepo.SaveChangesAsync(ct);
                }
            }

            await execRepo.SaveChangesAsync(ct);

            int countErros = 0;
            foreach (var erro in listErrosUpload)
            {
                await erroRepo.AddAsync(erro, ct);
            }

            await execRepo.SaveChangesAsync(ct);

            upload.MarcarConcluido(parseResult.TotalLinhas, execucoesAdicionadas, listErrosUpload.Count);
            await uploadRepo.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro processando upload {UploadId}", upload.Id);
            upload.MarcarErro("Erro interno no processamento: " + ex.Message);
            await uploadRepo.SaveChangesAsync(ct);
        }
    }
}
