using System;
using Identificacao.Domain.Enums;

namespace Identificacao.Domain.Entities;

public class Upload
{
    public Guid Id { get; private set; }
    public Guid CaptacaoId { get; private set; }
    public Captacao Captacao { get; private set; } = null!;
    public string NomeArquivo { get; private set; } = string.Empty;
    public string StorageFileId { get; private set; } = string.Empty;
    public StatusUpload Status { get; private set; }
    public int? TotalLinhas { get; private set; }
    public int? ExecucoesCriadas { get; private set; }
    public int? TotalErros { get; private set; }
    public string? MensagemErro { get; private set; }
    public Guid AnalistaId { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime? ProcessadoEm { get; private set; }

    private Upload() { }

    public static Upload Criar(Guid captacaoId, string nomeArquivo, string storageFileId, Guid analistaId) => new()
    {
        Id = Guid.NewGuid(),
        CaptacaoId = captacaoId,
        NomeArquivo = nomeArquivo,
        StorageFileId = storageFileId,
        Status = StatusUpload.Processando,
        AnalistaId = analistaId,
        CriadoEm = DateTime.UtcNow,
    };

    public void MarcarConcluido(int totalLinhas, int execucoesCriadas, int totalErros)
    {
        TotalLinhas = totalLinhas;
        ExecucoesCriadas = execucoesCriadas;
        TotalErros = totalErros;
        Status = totalErros > 0 ? StatusUpload.ConcluidoComErros : StatusUpload.Concluido;
        ProcessadoEm = DateTime.UtcNow;
    }

    public void MarcarErro(string mensagem)
    {
        Status = StatusUpload.Erro;
        MensagemErro = mensagem;
        ProcessadoEm = DateTime.UtcNow;
    }
}
