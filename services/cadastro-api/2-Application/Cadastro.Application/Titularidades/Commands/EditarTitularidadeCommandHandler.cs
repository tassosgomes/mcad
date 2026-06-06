using Cadastro.Application.Audit;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Queries;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Commands;

public class EditarTitularidadeCommandHandler : ICommandHandler<EditarTitularidadeCommand, TitularidadesResponse>
{
    private readonly ITitularidadeRepository _repository;
    private readonly IObraRepository _obraRepository;
    private readonly ITitularidadeAuditPublisher _auditPublisher;
    private readonly ICurrentUserPermissions _permissions;

    public EditarTitularidadeCommandHandler(
        ITitularidadeRepository repository,
        IObraRepository obraRepository,
        ITitularidadeAuditPublisher auditPublisher,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _obraRepository = obraRepository;
        _auditPublisher = auditPublisher;
        _permissions = permissions;
    }

    public async Task<TitularidadesResponse> HandleAsync(EditarTitularidadeCommand command, CancellationToken cancellationToken)
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
        titularidade.AlterarPercentual(command.Percentual);

        _repository.Update(titularidade);
        await _auditPublisher.PublishAsync(titularidade, TitularidadeAuditOperation.Edit, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Recalcular response
        var titularidades = await _repository.GetByObraIdAsync(command.ObraId, cancellationToken);
        var soma = titularidades.Sum(t => t.Percentual);
        var somaCompleta = soma == 100.0000m;
        var fullDocumentAllowed = await _permissions.HasAsync(CadastroPermissionNames.TitularVerCpfCompleto);
        
        return new TitularidadesResponse(
            command.ObraId,
            titularidades.Select(t => ListarTitularidadesQueryHandler.MapToItemResponse(t, fullDocumentAllowed)).ToList(),
            soma,
            somaCompleta
        );
    }
}
