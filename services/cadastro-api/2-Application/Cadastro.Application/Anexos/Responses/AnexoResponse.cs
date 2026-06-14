using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Responses;

public record AnexoResponse(
    Guid Id,
    string StorageFileId,
    TipoEntidadeAnexo EntidadeTipo,
    Guid EntidadeId,
    CategoriaAnexo Categoria,
    string NomeOriginal,
    string ContentType,
    long TamanhoBytes,
    string StatusScan,
    string UploadadoPor,
    DateTime CriadoEm
)
{
    public static AnexoResponse FromAnexo(Anexo a) => new(
        a.Id,
        a.StorageFileId,
        a.EntidadeTipo,
        a.EntidadeId,
        a.Categoria,
        a.NomeOriginal,
        a.ContentType,
        a.TamanhoBytes,
        a.StatusScan switch
        {
            StatusAnexo.PendenteScan => "pending_scan",
            StatusAnexo.Limpo        => "clean",
            StatusAnexo.Infectado    => "infected",
            _ => a.StatusScan.ToString()
        },
        a.UploadadoPor,
        a.CriadoEm
    );
}
