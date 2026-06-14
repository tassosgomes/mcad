using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Entities;

/// <summary>
/// Entidade de domínio Anexo — representa um arquivo armazenado no storage-service
/// vinculado a uma Obra, Fonograma ou Titular.
/// O storage-service é agnóstico ao domínio; nós somos donos de toda a semântica de negócio.
/// Regra: no máximo um Anexo ativo por (EntidadeId, Categoria).
/// </summary>
public class Anexo
{
    public Guid Id { get; private set; }

    /// <summary>ID retornado pelo storage-service (ULID de 26 chars).</summary>
    public string StorageFileId { get; private set; }

    public TipoEntidadeAnexo EntidadeTipo { get; private set; }
    public Guid EntidadeId { get; private set; }
    public CategoriaAnexo Categoria { get; private set; }
    public string NomeOriginal { get; private set; }
    public string ContentType { get; private set; }
    public long TamanhoBytes { get; private set; }
    public StatusAnexo StatusScan { get; private set; }
    public string UploadadoPor { get; private set; }
    public DateTime CriadoEm { get; private set; }

    /// <summary>Preenchido ao excluir (soft delete). Null = ativo.</summary>
    public DateTime? ExcluidoEm { get; private set; }

    public bool Ativo => ExcluidoEm == null;

    private Anexo()
    {
        StorageFileId = string.Empty;
        NomeOriginal  = string.Empty;
        ContentType   = string.Empty;
        UploadadoPor  = string.Empty;
    }

    public static Anexo Criar(
        string storageFileId,
        TipoEntidadeAnexo entidadeTipo,
        Guid entidadeId,
        CategoriaAnexo categoria,
        string nomeOriginal,
        string contentType,
        long tamanhoBytes,
        string uploadadoPor)
    {
        return new Anexo
        {
            Id            = Guid.NewGuid(),
            StorageFileId = storageFileId ?? throw new ArgumentNullException(nameof(storageFileId)),
            EntidadeTipo  = entidadeTipo,
            EntidadeId    = entidadeId,
            Categoria     = categoria,
            NomeOriginal  = nomeOriginal ?? throw new ArgumentNullException(nameof(nomeOriginal)),
            ContentType   = contentType  ?? throw new ArgumentNullException(nameof(contentType)),
            TamanhoBytes  = tamanhoBytes,
            StatusScan    = StatusAnexo.PendenteScan,
            UploadadoPor  = uploadadoPor ?? throw new ArgumentNullException(nameof(uploadadoPor)),
            CriadoEm     = DateTime.UtcNow,
            ExcluidoEm   = null,
        };
    }

    public void AtualizarStatusScan(StatusAnexo status)
    {
        StatusScan = status;
    }

    public void MarcarExcluido()
    {
        ExcluidoEm = DateTime.UtcNow;
    }
}
