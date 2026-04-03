using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Execucoes.Responses;
using Identificacao.Application.TiposUtilizacao.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Execucoes.Queries;

public class ListarExecucoesQueryHandler : IQueryHandler<ListarExecucoesQuery, ListarExecucoesResponse>
{
    private readonly IExecucaoRepository _repository;
    private readonly ICaptacaoRepository _captacaoRepo;

    public ListarExecucoesQueryHandler(IExecucaoRepository repository, ICaptacaoRepository captacaoRepo)
    {
        _repository = repository;
        _captacaoRepo = captacaoRepo;
    }

    public async Task<ListarExecucoesResponse> HandleAsync(ListarExecucoesQuery query, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(query.CaptacaoId, ct);
        if (captacao == null)
            throw new NotFoundException("Captação não encontrada.");

        var sort = string.IsNullOrWhiteSpace(query.Sort) ? "-criadoEm" : query.Sort;
        var page = query.Page ?? 1;
        var size = query.Size ?? 10;

        var (items, total) = await _repository.ListarAsync(
            query.CaptacaoId, query.Status, sort, page, size, ct);

        var responseItems = items.Select(e => new ExecucaoResponse(
            e.Id,
            e.ObraId,
            e.FonogramaId,
            e.ObraTitulo,
            e.FonogramaIsrc,
            e.ObraIswc,
            e.Interpretes,
            e.Inicio.ToString("HH:mm:ss"),
            e.Fim.ToString("HH:mm:ss"),
            e.DuracaoSegundos,
            e.Quantidade,
            e.TipoUtilizacao != null ? new TipoUtilizacaoResponse(e.TipoUtilizacao.Id, e.TipoUtilizacao.Sigla, e.TipoUtilizacao.Descricao, e.TipoUtilizacao.Peso) : null,
            e.TituloPrograma,
            e.Status.ToString()
        ));

        return new ListarExecucoesResponse(responseItems, total);
    }
}
