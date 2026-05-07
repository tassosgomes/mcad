using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;

namespace Cadastro.Application.Status.Commands;

public record LiberarObraCommand(Guid Id) : ICommand<ObraResponse>;

public class LiberarObraCommandHandler : ICommandHandler<LiberarObraCommand, ObraResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly ITitularidadeRepository _titularidadeRepository;
    private readonly IOutboxEventWriter _outbox;
    private readonly IObraAuditPublisher _auditPublisher;

    public LiberarObraCommandHandler(
        IObraRepository obraRepository,
        ITitularidadeRepository titularidadeRepository,
        IOutboxEventWriter outbox,
        IObraAuditPublisher auditPublisher)
    {
        _obraRepository = obraRepository;
        _titularidadeRepository = titularidadeRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
    }

    public async Task<ObraResponse> HandleAsync(LiberarObraCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.Id);

        if (obra.Status != StatusObra.Pendente)
        {
            throw new ConflictException("Apenas obras PENDENTES podem ser liberadas.");
        }

        var titularidades = await _titularidadeRepository.GetByObraIdAsync(obra.Id, cancellationToken);
        var somaTitularidades = titularidades.Sum(t => t.Percentual);
        bool temIswc = !string.IsNullOrWhiteSpace(obra.Iswc);

        var pendencias = ValidadorLiberacaoObra.Validar(obra, somaTitularidades, temIswc);

        if (pendencias.Any(p => !p.Atendido))
        {
            throw new PreRequisitosException("Não é possível liberar. Existem pendências.", pendencias);
        }

        var before = _auditPublisher.Snapshot(obra);
        obra.Liberar();
        _obraRepository.Update(obra);

        // Registrar evento na outbox — mesma transação que a liberação da obra (RF-17)
        _outbox.AddEvent("cadastro.obra.liberada", obra.Id.ToString(), new
        {
            obraId = obra.Id,
            titulo = obra.Titulo,
            iswc = obra.Iswc,
        });

        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.Release, before, cancellationToken);
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
