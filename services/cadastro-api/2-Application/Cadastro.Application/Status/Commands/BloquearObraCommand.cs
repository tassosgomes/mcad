using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Status.Commands;

public record BloquearObraCommand(Guid Id, string Justificativa) : ICommand<ObraResponse>;

public class BloquearObraCommandValidator : AbstractValidator<BloquearObraCommand>
{
    public BloquearObraCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("ID da obra é obrigatório.");
        RuleFor(x => x.Justificativa)
            .NotEmpty().WithMessage("Justificativa é obrigatória.")
            .MinimumLength(10).WithMessage("Justificativa deve ter no mínimo 10 caracteres.")
            .MaximumLength(500).WithMessage("Justificativa deve ter no máximo 500 caracteres.");
    }
}

public class BloquearObraCommandHandler : ICommandHandler<BloquearObraCommand, ObraResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly IHistoricoBloqueioRepository _historicoRepository;
    private readonly IOutboxEventWriter _outbox;
    private readonly IObraAuditPublisher _auditPublisher;

    public BloquearObraCommandHandler(
        IObraRepository obraRepository,
        IHistoricoBloqueioRepository historicoRepository,
        IOutboxEventWriter outbox,
        IObraAuditPublisher auditPublisher)
    {
        _obraRepository = obraRepository;
        _historicoRepository = historicoRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
    }

    public async Task<ObraResponse> HandleAsync(BloquearObraCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.Id);

        var before = _auditPublisher.Snapshot(obra);
        obra.Bloquear(command.Justificativa);

        var historico = HistoricoBloqueio.CriarBloqueio("OBRA", obra.Id, command.Justificativa);
        _historicoRepository.Add(historico);

        _obraRepository.Update(obra);

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.obra.bloqueada", obra.Id.ToString(), new
        {
            obraId = obra.Id,
            titulo = obra.Titulo,
            justificativa = command.Justificativa,
        });

        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.Block, before, cancellationToken);
        await _obraRepository.SaveChangesAsync(cancellationToken);

        return new ObraResponse(
            obra.Id,
            obra.Codigo,
            obra.Titulo,
            obra.Subtitulo,
            obra.Tipo.ToString().ToUpperInvariant(),
            obra.Genero,
            obra.Iswc,
            obra.Status.ToString().ToUpperInvariant(),
            obra.DominioPublico,
            obra.ObraDepuradaParaId,
            obra.CriadoEm,
            obra.AtualizadoEm,
            obra.BloqueioJustificativa
        );
    }
}
