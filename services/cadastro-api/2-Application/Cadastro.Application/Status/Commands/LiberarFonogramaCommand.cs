using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;

namespace Cadastro.Application.Status.Commands;

public record LiberarFonogramaCommand(Guid Id) : ICommand<FonogramaResponse>;

public class LiberarFonogramaCommandHandler : ICommandHandler<LiberarFonogramaCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IParticipacaoRepository _participacaoRepository;
    private readonly IOutboxEventWriter _outbox;
    private readonly IFonogramaAuditPublisher _auditPublisher;

    public LiberarFonogramaCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IParticipacaoRepository participacaoRepository,
        IOutboxEventWriter outbox,
        IFonogramaAuditPublisher auditPublisher)
    {
        _fonogramaRepository = fonogramaRepository;
        _participacaoRepository = participacaoRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
    }

    public async Task<FonogramaResponse> HandleAsync(LiberarFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.Id);

        if (fonograma.Status != StatusFonograma.PendenteDocumentacao)
        {
            throw new ConflictException("Apenas fonogramas em PENDENTE_DOCUMENTACAO podem ser liberados.");
        }

        var participacoes = await _participacaoRepository.GetByFonogramaIdAsync(fonograma.Id, cancellationToken);
        var somaConexos = participacoes.Sum(p => p.Percentual ?? 0m);
        bool obraLiberada = fonograma.Obra.Status == StatusObra.Liberado;

        var pendencias = ValidadorLiberacaoFonograma.Validar(fonograma, somaConexos, obraLiberada);

        if (pendencias.Any(p => !p.Atendido))
        {
            throw new PreRequisitosException("Não é possível liberar. Existem pendências.", pendencias);
        }

        var before = _auditPublisher.Snapshot(fonograma);
        fonograma.Liberar();
        _fonogramaRepository.Update(fonograma);

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.fonograma.liberado", fonograma.Id.ToString(), new
        {
            fonogramaId = fonograma.Id,
            isrc = fonograma.Isrc.Valor,
            obraId = fonograma.ObraId,
        });

        await _auditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Release, before, cancellationToken);
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
