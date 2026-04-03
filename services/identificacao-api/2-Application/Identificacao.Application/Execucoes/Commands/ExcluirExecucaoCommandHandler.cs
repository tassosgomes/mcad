using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Execucoes.Commands;

public class ExcluirExecucaoCommandHandler : ICommandHandler<ExcluirExecucaoCommand, bool>
{
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly ICaptacaoRepository _captacaoRepo;

    public ExcluirExecucaoCommandHandler(
        IExecucaoRepository execucaoRepo,
        ICaptacaoRepository captacaoRepo)
    {
        _execucaoRepo = execucaoRepo;
        _captacaoRepo = captacaoRepo;
    }

    public async Task<bool> HandleAsync(ExcluirExecucaoCommand command, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(command.CaptacaoId, ct);
        if (captacao == null)
            throw new NotFoundException("Captação não encontrada.");

        if (captacao.AnalistaResponsavelId != command.AnalistaId)
            throw new ForbiddenException("Você não tem permissão para editar esta captação.");

        if (captacao.Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações ABERTAS podem ter suas execuções excluídas.");

        var execucao = await _execucaoRepo.GetByIdAsync(command.CaptacaoId, command.Id, ct);
        if (execucao == null)
            throw new NotFoundException("Execução não encontrada.");

        await _execucaoRepo.RemoveAsync(execucao, ct);
        await _execucaoRepo.SaveChangesAsync(ct);
        return true;
    }
}
