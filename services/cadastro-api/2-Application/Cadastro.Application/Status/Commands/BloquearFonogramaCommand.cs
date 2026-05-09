using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Status.Commands;

public record BloquearFonogramaCommand(Guid Id, string Justificativa) : ICommand<FonogramaResponse>;

public class BloquearFonogramaCommandValidator : AbstractValidator<BloquearFonogramaCommand>
{
    public BloquearFonogramaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("ID do fonograma é obrigatório.");
        RuleFor(x => x.Justificativa)
            .NotEmpty().WithMessage("Justificativa é obrigatória.")
            .MinimumLength(10).WithMessage("Justificativa deve ter no mínimo 10 caracteres.")
            .MaximumLength(500).WithMessage("Justificativa deve ter no máximo 500 caracteres.");
    }
}

public class BloquearFonogramaCommandHandler : ICommandHandler<BloquearFonogramaCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IHistoricoBloqueioRepository _historicoRepository;
    private readonly IOutboxEventWriter _outbox;
    private readonly IFonogramaAuditPublisher _auditPublisher;

    public BloquearFonogramaCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IHistoricoBloqueioRepository historicoRepository,
        IOutboxEventWriter outbox,
        IFonogramaAuditPublisher auditPublisher)
    {
        _fonogramaRepository = fonogramaRepository;
        _historicoRepository = historicoRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
    }

    public async Task<FonogramaResponse> HandleAsync(BloquearFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.Id);

        var before = _auditPublisher.Snapshot(fonograma);

        fonograma.Bloquear(command.Justificativa);

        var historico = HistoricoBloqueio.CriarBloqueio("FONOGRAMA", fonograma.Id, command.Justificativa);
        _historicoRepository.Add(historico);

        _fonogramaRepository.Update(fonograma);

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.fonograma.bloqueado", fonograma.Id.ToString(), new
        {
            fonogramaId = fonograma.Id,
            isrc = fonograma.Isrc.Valor,
            justificativa = command.Justificativa,
        });

        await _auditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Block, before, cancellationToken);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        var obraStatus = fonograma.Obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : fonograma.Obra.Status.ToString().ToUpperInvariant();
        var fStatus = fonograma.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                      fonograma.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                      fonograma.Status.ToString().ToUpperInvariant();

        return new FonogramaResponse(
            fonograma.Id,
            fonograma.Codigo,
            fonograma.Isrc.Valor,
            fonograma.Isrc.Formatado,
            new ObraResumoResponse(fonograma.Obra.Id, fonograma.Obra.Codigo, fonograma.Obra.Titulo, obraStatus),
            fonograma.PaisOrigem,
            fonograma.DataGravacao,
            fonograma.DataLancamento,
            fStatus,
            fonograma.FonogramaDepuradoParaId,
            fonograma.CriadoEm,
            fonograma.AtualizadoEm,
            fonograma.UrlAudio,
            fonograma.BloqueioJustificativa
        );
    }
}
