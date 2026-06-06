using Cadastro.Application.Audit;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Queries;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Participacoes.Commands;

public class AjustarPercentualCommandHandler : ICommandHandler<AjustarPercentualCommand, ParticipacoesResponse>
{
    private readonly IParticipacaoRepository _repository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IParticipacaoAuditPublisher _auditPublisher;
    private readonly ICurrentUserPermissions _permissions;

    public AjustarPercentualCommandHandler(
        IParticipacaoRepository repository,
        IFonogramaRepository fonogramaRepository,
        IParticipacaoAuditPublisher auditPublisher,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _fonogramaRepository = fonogramaRepository;
        _auditPublisher = auditPublisher;
        _permissions = permissions;
    }

    public async Task<ParticipacoesResponse> HandleAsync(AjustarPercentualCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.FonogramaId, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.FonogramaId);

        if (fonograma.Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser alterados");
        if (fonograma.Status == StatusFonograma.Liberado)
            throw new DepuracaoNecessariaException("Ajustar percentual em fonograma LIBERADO requer depuração");

        var participacao = await _repository.GetByIdAsync(command.ParticipacaoId, cancellationToken)
            ?? throw new NotFoundException(nameof(ParticipacaoConexa), command.ParticipacaoId);

        if (participacao.FonogramaId != command.FonogramaId)
            throw new NotFoundException(nameof(ParticipacaoConexa), command.ParticipacaoId);

        var before = _auditPublisher.Snapshot(participacao);
        // DomainException se músico (rejeita 422)
        participacao.AjustarPercentualManual(command.Percentual);

        await _auditPublisher.PublishAsync(participacao, ParticipacaoAuditOperation.Adjust, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        var todas = (await _repository.GetByFonogramaIdAsync(command.FonogramaId, cancellationToken)).ToList();
        var fullDocumentAllowed = await _permissions.HasAsync(CadastroPermissionNames.TitularVerCpfCompleto);
        return ListarParticipacoesQueryHandler.BuildResponse(
            command.FonogramaId,
            todas,
            fonograma.PercentuaisDesatualizados,
            fullDocumentAllowed);
    }
}
