using Cadastro.Application.Common.Responses;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Fonogramas.Queries;

public record ListarFonogramasQuery(
    int Page = 1,
    int Size = 20,
    string? Sort = "isrc",
    long? Codigo = null,
    string? Isrc = null,
    Guid? ObraId = null,
    string? ObraTitulo = null,
    StatusFonograma? Status = null,
    string? Pais = null
) : IQuery<FonogramaListResponse>;

public class ListarFonogramasHandler : IQueryHandler<ListarFonogramasQuery, FonogramaListResponse>
{
    private readonly IFonogramaRepository _repository;

    public ListarFonogramasHandler(IFonogramaRepository repository)
    {
        _repository = repository;
    }

    public async Task<FonogramaListResponse> HandleAsync(ListarFonogramasQuery query, CancellationToken cancellationToken)
    {
        var filtro = new FonogramaFiltro(
            query.Page,
            query.Size,
            query.Sort,
            query.Codigo,
            query.Isrc,
            query.ObraId,
            query.ObraTitulo,
            query.Status,
            query.Pais
        );

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);
        var totalPages = (int)Math.Ceiling(total / (double)query.Size);

        var responses = items.Select(f => {
            var obraStatus = f.Obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : f.Obra.Status.ToString().ToUpperInvariant();
            var fStatus = f.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                          f.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                          f.Status.ToString().ToUpperInvariant();

            return new FonogramaResponse(
                f.Id,
                f.Codigo,
                f.Isrc.Valor,
                f.Isrc.Formatado,
                new ObraResumoResponse(f.Obra.Id, f.Obra.Codigo, f.Obra.Titulo, obraStatus),
                f.PaisOrigem,
                f.DataGravacao,
                f.DataLancamento,
                fStatus,
                f.FonogramaDepuradoParaId,
                f.CriadoEm,
                f.AtualizadoEm
            );
        });

        return new FonogramaListResponse(
            responses,
            new PaginationResponse(query.Page, query.Size, total, totalPages)
        );
    }
}
