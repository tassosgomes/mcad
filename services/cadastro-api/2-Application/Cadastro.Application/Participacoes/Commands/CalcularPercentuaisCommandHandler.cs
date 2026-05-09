using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Queries;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;

namespace Cadastro.Application.Participacoes.Commands;

public class CalcularPercentuaisCommandHandler : ICommandHandler<CalcularPercentuaisCommand, ParticipacoesResponse>
{
    private readonly IParticipacaoRepository _repository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IParticipacaoAuditPublisher _auditPublisher;

    public CalcularPercentuaisCommandHandler(
        IParticipacaoRepository repository,
        IFonogramaRepository fonogramaRepository,
        IParticipacaoAuditPublisher auditPublisher)
    {
        _repository = repository;
        _fonogramaRepository = fonogramaRepository;
        _auditPublisher = auditPublisher;
    }

    public async Task<ParticipacoesResponse> HandleAsync(CalcularPercentuaisCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.FonogramaId, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.FonogramaId);

        if (fonograma.Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser alterados");
        if (fonograma.Status == StatusFonograma.Liberado)
            throw new DepuracaoNecessariaException("Recalcular participações de fonograma LIBERADO requer depuração");

        var participacoes = (await _repository.GetByFonogramaIdAsync(command.FonogramaId, cancellationToken)).ToList();
        var snapshotsAntes = participacoes.ToDictionary(p => p.Id, p => _auditPublisher.Snapshot(p));

        // Domain Service calcula — DomainException se sem intérprete ou produtor
        CalculadoraConexos.Calcular(participacoes);

        fonograma.MarcarPercentuaisAtualizados();
        fonograma.TransicionarParaPendenteDocumentacao();
        _fonogramaRepository.Update(fonograma);

        foreach (var p in participacoes)
        {
            await _auditPublisher.PublishAsync(p, ParticipacaoAuditOperation.Calculate, snapshotsAntes[p.Id], cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return ListarParticipacoesQueryHandler.BuildResponse(command.FonogramaId, participacoes, fonograma.PercentuaisDesatualizados);
    }
}
