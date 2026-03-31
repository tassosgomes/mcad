using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Fonogramas.Queries;

public record GetFonogramaByIdQuery(Guid Id) : IQuery<FonogramaResponse>;

public class GetFonogramaByIdHandler : IQueryHandler<GetFonogramaByIdQuery, FonogramaResponse>
{
    private readonly IFonogramaRepository _repository;

    public GetFonogramaByIdHandler(IFonogramaRepository repository)
    {
        _repository = repository;
    }

    public async Task<FonogramaResponse> HandleAsync(GetFonogramaByIdQuery query, CancellationToken cancellationToken)
    {
        var f = await _repository.GetByIdAsync(query.Id, cancellationToken);
        
        if (f == null)
            throw new NotFoundException($"Fonograma não encontrado.", query.Id);

        var obraStatus = f.Obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : f.Obra.Status.ToString().ToUpperInvariant();
        var fStatus = f.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                      f.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                      f.Status.ToString().ToUpperInvariant();

        return new FonogramaResponse(
            f.Id,
            f.Isrc.Valor,
            f.Isrc.Formatado,
            new ObraResumoResponse(f.Obra.Id, f.Obra.Titulo, obraStatus),
            f.PaisOrigem,
            f.DataGravacao,
            f.DataLancamento,
            fStatus,
            f.FonogramaDepuradoParaId,
            f.CriadoEm,
            f.AtualizadoEm
        );
    }
}
