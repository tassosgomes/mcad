using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Queries;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Commands;

public class RemoverTitularidadeCommandHandler : ICommandHandler<RemoverTitularidadeCommand, TitularidadesResponse>
{
    private readonly ITitularidadeRepository _repository;
    private readonly IObraRepository _obraRepository;
    private readonly ITitularidadeAuditPublisher _auditPublisher;

    public RemoverTitularidadeCommandHandler(
        ITitularidadeRepository repository,
        IObraRepository obraRepository,
        ITitularidadeAuditPublisher auditPublisher)
    {
        _repository = repository;
        _obraRepository = obraRepository;
        _auditPublisher = auditPublisher;
    }

    public async Task<TitularidadesResponse> HandleAsync(RemoverTitularidadeCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.ObraId, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.ObraId);

        if (obra.Status == StatusObra.Depurada)
            throw new DomainException("Obras depuradas não podem ser alteradas");
        if (obra.Status == StatusObra.Liberado)
            throw new DepuracaoNecessariaException("Alterar titulares de uma obra LIBERADA requer depuração");

        var titularidade = await _repository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(TitularidadeAutoral), command.Id);

        if (titularidade.ObraId != command.ObraId)
            throw new DomainException("A titularidade não pertence à obra informada");

        var before = _auditPublisher.Snapshot(titularidade);
        _repository.Delete(titularidade);
        await _auditPublisher.PublishAsync(titularidade, TitularidadeAuditOperation.Remove, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Recalcular response
        var titularidades = await _repository.GetByObraIdAsync(command.ObraId, cancellationToken);
        var soma = titularidades.Sum(t => t.Percentual);
        var somaCompleta = soma == 100.0000m;
        
        return new TitularidadesResponse(
            command.ObraId,
            titularidades.Select(ListarTitularidadesQueryHandler.MapToItemResponse).ToList(),
            soma,
            somaCompleta
        );
    }
}
