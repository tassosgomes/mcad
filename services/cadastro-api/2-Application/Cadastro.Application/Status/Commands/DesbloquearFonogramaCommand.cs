using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Status.Commands;

public record DesbloquearFonogramaCommand(Guid Id) : ICommand<FonogramaResponse>;

public class DesbloquearFonogramaCommandHandler : ICommandHandler<DesbloquearFonogramaCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IHistoricoBloqueioRepository _historicoRepository;
    private readonly IFonogramaAuditPublisher _auditPublisher;

    public DesbloquearFonogramaCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IHistoricoBloqueioRepository historicoRepository,
        IFonogramaAuditPublisher auditPublisher)
    {
        _fonogramaRepository = fonogramaRepository;
        _historicoRepository = historicoRepository;
        _auditPublisher = auditPublisher;
    }

    public async Task<FonogramaResponse> HandleAsync(DesbloquearFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.Id);

        var before = _auditPublisher.Snapshot(fonograma);
        fonograma.Desbloquear();

        var historico = HistoricoBloqueio.CriarDesbloqueio("FONOGRAMA", fonograma.Id);
        _historicoRepository.Add(historico);

        _fonogramaRepository.Update(fonograma);
        await _auditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Unblock, before, cancellationToken);
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
