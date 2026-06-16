using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Queries;

public class GetCaptacaoByIdQueryHandler : IQueryHandler<GetCaptacaoByIdQuery, CaptacaoDetalheResponse>
{
    private readonly ICaptacaoRepository _repository;
    private readonly IExecucaoRepository _execucaoRepo;

    public GetCaptacaoByIdQueryHandler(ICaptacaoRepository repository, IExecucaoRepository execucaoRepo)
    {
        _repository = repository;
        _execucaoRepo = execucaoRepo;
    }

    public async Task<CaptacaoDetalheResponse> HandleAsync(GetCaptacaoByIdQuery query, CancellationToken cancellationToken)
    {
        var captacao = await _repository.GetByIdAsync(query.Id, cancellationToken);

        if (captacao == null)
            throw new NotFoundException("Captação não encontrada.");

        var total = await _execucaoRepo.ContarPorCaptacaoAsync(query.Id, cancellationToken);
        var identificadas = await _execucaoRepo.ContarIdentificadasAsync(query.Id, cancellationToken);
        var pendentes = await _execucaoRepo.ContarPendentesAsync(query.Id, cancellationToken);

        var resumo = new ResumoExecucoesResponse(total, identificadas, pendentes);

        var rubricaResponse = new RubricaResponse(
            captacao.Rubrica!.Id, 
            captacao.Rubrica.Sigla, 
            captacao.Rubrica.Nome, 
            captacao.Rubrica.ExigeClassificacao);

        return new CaptacaoDetalheResponse(
            captacao.Id,
            rubricaResponse,
            captacao.Periodo.ToString("yyyy-MM-dd"),
            captacao.UsuarioMusicaId,
            captacao.UsuarioMusicaNome,
            captacao.Status.ToString(),
            new AnalistaResumoResponse(captacao.AnalistaResponsavelId, captacao.AnalistaResponsavelNome),
            resumo,
            captacao.CriadoEm,
            captacao.AtualizadoEm
        );
    }
}
