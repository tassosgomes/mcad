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

public class AdicionarTitularidadeCommandHandler : ICommandHandler<AdicionarTitularidadeCommand, TitularidadesResponse>
{
    private readonly ITitularidadeRepository _repository;
    private readonly IObraRepository _obraRepository;
    private readonly ITitularRepository _titularRepository;
    private readonly ITitularidadeAuditPublisher _auditPublisher;
    private readonly ICurrentUserPermissions _permissions;

    public AdicionarTitularidadeCommandHandler(
        ITitularidadeRepository repository,
        IObraRepository obraRepository,
        ITitularRepository titularRepository,
        ITitularidadeAuditPublisher auditPublisher,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _obraRepository = obraRepository;
        _titularRepository = titularRepository;
        _auditPublisher = auditPublisher;
        _permissions = permissions;
    }

    public async Task<TitularidadesResponse> HandleAsync(AdicionarTitularidadeCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.ObraId, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.ObraId);

        if (obra.Status == StatusObra.Depurada)
            throw new DomainException("Obras depuradas não podem ser alteradas");
        if (obra.Status == StatusObra.Liberado)
            throw new DepuracaoNecessariaException("Alterar titulares de uma obra LIBERADA requer depuração");

        var titular = await _titularRepository.GetByIdAsync(command.TitularId, cancellationToken)
            ?? throw new NotFoundException(nameof(Titular), command.TitularId);

        var categoria = Enum.Parse<CategoriaAutoral>(command.Categoria, true);

        if (categoria == CategoriaAutoral.Editor && titular.Tipo == TipoTitular.PF)
            throw new DomainException("A categoria Editor exige titular Pessoa Jurídica");

        if (await _repository.ExisteDuplicataAsync(command.ObraId, command.TitularId, categoria, cancellationToken))
            throw new ConflictException("Este titular já está vinculado com esta categoria nesta obra");

        var titularidade = TitularidadeAutoral.Criar(command.ObraId, command.TitularId, categoria, command.Percentual);

        await _repository.AddAsync(titularidade, cancellationToken);
        await _auditPublisher.PublishAsync(titularidade, TitularidadeAuditOperation.Add, before: null, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Recalcular response
        var titularidades = await _repository.GetByObraIdAsync(command.ObraId, cancellationToken);
        var soma = titularidades.Sum(t => t.Percentual);
        var somaCompleta = soma == 100.0000m;
        var fullDocumentAllowed = _permissions.Has(CadastroPermissionNames.TitularVerCpfCompleto);
        
        return new TitularidadesResponse(
            command.ObraId,
            titularidades.Select(t => ListarTitularidadesQueryHandler.MapToItemResponse(t, fullDocumentAllowed)).ToList(),
            soma,
            somaCompleta
        );
    }
}
