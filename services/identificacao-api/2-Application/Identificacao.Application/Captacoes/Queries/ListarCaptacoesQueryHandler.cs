using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Captacoes.Queries;

public class ListarCaptacoesQueryHandler : IQueryHandler<ListarCaptacoesQuery, CaptacaoListResponse>
{
    private readonly ICaptacaoRepository _repository;

    public ListarCaptacoesQueryHandler(ICaptacaoRepository repository)
    {
        _repository = repository;
    }

    private static Identificacao.Domain.Enums.StatusCaptacao? ParseStatus(string? value) => value switch
    {
        null or "" => null,
        _ => Enum.TryParse<Identificacao.Domain.Enums.StatusCaptacao>(value, ignoreCase: true, out var v) ? v : null
    };

    public async Task<CaptacaoListResponse> HandleAsync(ListarCaptacoesQuery query, CancellationToken cancellationToken)
    {
        var filtro = new {
            query.RubricaId,
            query.PeriodoInicial,
            query.PeriodoFinal,
            Status = ParseStatus(query.Status),
            query.AnalistaResponsavelId,
            query.Sort,
            query.Page,
            query.Size
        };

        var result = await _repository.ListarAsync(filtro, cancellationToken);
        var totalPages = (int)Math.Ceiling((double)result.Total / (query.Size ?? 10));

        var items = result.Items.Select(c => new CaptacaoResponse(
            c.Id,
            new RubricaResponse(c.Rubrica!.Id, c.Rubrica.Sigla, c.Rubrica.Nome, c.Rubrica.ExigeClassificacao),
            c.Periodo.ToString("yyyy-MM-dd"),
            c.UsuarioDeMusica,
            c.Status.ToString(),
            new AnalistaResumoResponse(c.AnalistaResponsavelId, c.AnalistaResponsavelNome),
            c.CriadoEm,
            c.AtualizadoEm
        ));

        return new CaptacaoListResponse(
            items,
            new PaginationResponse(query.Page ?? 1, query.Size ?? 10, result.Total, totalPages)
        );
    }
}
