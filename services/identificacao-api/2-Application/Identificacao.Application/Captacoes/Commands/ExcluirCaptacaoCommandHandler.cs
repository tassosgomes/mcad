using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Commands;

public class ExcluirCaptacaoCommandHandler : ICommandHandler<ExcluirCaptacaoCommand, Unit>
{
    private readonly ICaptacaoRepository _captacaoRepo;

    public ExcluirCaptacaoCommandHandler(ICaptacaoRepository captacaoRepo)
    {
        _captacaoRepo = captacaoRepo;
    }

    public async Task<Unit> HandleAsync(ExcluirCaptacaoCommand cmd, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(cmd.Id, ct)
            ?? throw new NotFoundException("Captação não encontrada.");

        captacao.ValidarPropriedade(cmd.AnalistaId);
        captacao.ValidarAberta();

        await _captacaoRepo.RemoveAsync(captacao, ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
