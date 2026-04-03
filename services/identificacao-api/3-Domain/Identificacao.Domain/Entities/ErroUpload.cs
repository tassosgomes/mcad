using System;

namespace Identificacao.Domain.Entities;

public class ErroUpload
{
    public Guid Id { get; private set; }
    public Guid UploadId { get; private set; }
    public Upload Upload { get; private set; } = null!;
    public int Linha { get; private set; }
    public string Coluna { get; private set; } = string.Empty;
    public string Mensagem { get; private set; } = string.Empty;
    public DateTime CriadoEm { get; private set; }

    private ErroUpload() { }

    public static ErroUpload Criar(Guid uploadId, int linha, string coluna, string mensagem) => new()
    {
        Id = Guid.NewGuid(),
        UploadId = uploadId,
        Linha = linha,
        Coluna = coluna,
        Mensagem = mensagem,
        CriadoEm = DateTime.UtcNow,
    };
}
