using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Queries;

public class ListarCaptacoesQueryHandler : IQueryHandler<ListarCaptacoesQuery, (IEnumerable<CaptacaoResponse> Items, int Total)>
{
    private readonly ICaptacaoRepository _repository;

    public ListarCaptacoesQueryHandler(ICaptacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<(IEnumerable<CaptacaoResponse> Items, int Total)> HandleAsync(ListarCaptacoesQuery query, CancellationToken cancellationToken)
    {
        var result = await _repository.ListarAsync(query, cancellationToken);

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

        return (items, result.Total);
    }
}
