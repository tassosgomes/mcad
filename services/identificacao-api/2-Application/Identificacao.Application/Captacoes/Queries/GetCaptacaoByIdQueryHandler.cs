using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Queries;

public class GetCaptacaoByIdQueryHandler : IQueryHandler<GetCaptacaoByIdQuery, CaptacaoDetalheResponse>
{
    private readonly ICaptacaoRepository _repository;

    public GetCaptacaoByIdQueryHandler(ICaptacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<CaptacaoDetalheResponse> HandleAsync(GetCaptacaoByIdQuery query, CancellationToken cancellationToken)
    {
        var captacao = await _repository.GetByIdAsync(query.Id, cancellationToken);

        if (captacao == null)
            throw new NotFoundException("Captação não encontrada.");

        var totalExecucoes = await _repository.ContarExecucoesAsync(query.Id, cancellationToken);
        var resumo = new ResumoExecucoesResponse(totalExecucoes, 0, 0);

        var rubricaResponse = new RubricaResponse(
            captacao.Rubrica!.Id, 
            captacao.Rubrica.Sigla, 
            captacao.Rubrica.Nome, 
            captacao.Rubrica.ExigeClassificacao);

        return new CaptacaoDetalheResponse(
            captacao.Id,
            rubricaResponse,
            captacao.Periodo.ToString("yyyy-MM-dd"),
            captacao.UsuarioDeMusica,
            captacao.Status.ToString(),
            new AnalistaResumoResponse(captacao.AnalistaResponsavelId, captacao.AnalistaResponsavelNome),
            resumo,
            captacao.CriadoEm,
            captacao.AtualizadoEm
        );
    }
}
