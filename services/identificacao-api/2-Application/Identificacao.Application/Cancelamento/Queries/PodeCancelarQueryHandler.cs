using Identificacao.Application.Cancelamento.Responses;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Cancelamento.Queries;

public class PodeCancelarQueryHandler : IQueryHandler<PodeCancelarQuery, PodeCancelarResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;

    public PodeCancelarQueryHandler(ICaptacaoRepository captacaoRepo)
    {
        _captacaoRepo = captacaoRepo;
    }

    public async Task<PodeCancelarResponse> HandleAsync(PodeCancelarQuery query, CancellationToken cancellationToken)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(query.CaptacaoId, cancellationToken)
            ?? throw new NotFoundException($"Captação {query.CaptacaoId} não encontrada.");

        string? motivo = null;
        var pode = false;

        if (captacao.Status == StatusCaptacao.Cancelada)
            motivo = "Captação já está cancelada.";
        else if (captacao.Status != StatusCaptacao.Fechada)
            motivo = "Apenas captações FECHADAS podem ser canceladas.";
        else if (captacao.DistribuicaoProcessada)
            motivo = "Este Rol já foi processado pela Distribuição.";
        else
            pode = true;

        return new PodeCancelarResponse(
            captacao.Id,
            pode,
            motivo,
            captacao.DistribuicaoProcessada,
            captacao.DistribuicaoProcessadaEm);
    }
}
