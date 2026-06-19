using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Fonogramas.Commands;

public record CriarFonogramaPendenteCommand(string Isrc, Guid ObraId) : ICommand<FonogramaResponse>;

public class CriarFonogramaPendenteCommandValidator : AbstractValidator<CriarFonogramaPendenteCommand>
{
    public CriarFonogramaPendenteCommandValidator()
    {
        RuleFor(x => x.Isrc)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("ISRC é obrigatório.")
            .Length(12).WithMessage("ISRC deve ter 12 caracteres (sem hífens).")
            .Must(BeValidIsrc).WithMessage("ISRC deve seguir formato CC-XXX-YY-NNNNN (12 caracteres alfanuméricos).");

        RuleFor(x => x.ObraId)
            .NotEmpty().WithMessage("ID da obra é obrigatório.");
    }

    private static bool BeValidIsrc(string value)
    {
        try
        {
            Isrc.Create(value);
            return true;
        }
        catch (DomainException)
        {
            return false;
        }
    }
}

public class CriarFonogramaPendenteCommandHandler : ICommandHandler<CriarFonogramaPendenteCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IObraRepository _obraRepository;
    private readonly IFonogramaAuditPublisher _auditPublisher;

    public CriarFonogramaPendenteCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IObraRepository obraRepository,
        IFonogramaAuditPublisher auditPublisher)
    {
        _fonogramaRepository = fonogramaRepository;
        _obraRepository = obraRepository;
        _auditPublisher = auditPublisher;
    }

    public async Task<FonogramaResponse> HandleAsync(CriarFonogramaPendenteCommand command, CancellationToken cancellationToken)
    {
        var isrc = Isrc.Create(command.Isrc);

        if (await _fonogramaRepository.ExisteIsrcAsync(isrc.Valor, cancellationToken))
        {
            throw new ConflictException($"Já existe um fonograma com o ISRC '{isrc.Formatado}'.");
        }

        var obra = await _obraRepository.GetByIdAsync(command.ObraId, cancellationToken);
        if (obra == null)
        {
            throw new NotFoundException("Obra não encontrada.", command.ObraId);
        }

        var paisOrigem = isrc.Valor[..2];
        var fonograma = Fonograma.Criar(isrc, command.ObraId, paisOrigem);

        await _fonogramaRepository.AddAsync(fonograma, cancellationToken);
        await _auditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Create, before: null, cancellationToken);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        var obraStatus = obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : obra.Status.ToString().ToUpperInvariant();
        var fStatus = fonograma.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                      fonograma.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                      fonograma.Status.ToString().ToUpperInvariant();

        return new FonogramaResponse(
            fonograma.Id,
            fonograma.Codigo,
            fonograma.Isrc.Valor,
            fonograma.Isrc.Formatado,
            new ObraResumoResponse(obra.Id, obra.Codigo, obra.Titulo, obraStatus),
            fonograma.PaisOrigem,
            fonograma.DataGravacao,
            fonograma.DataLancamento,
            fStatus,
            fonograma.FonogramaDepuradoParaId,
            fonograma.CriadoEm,
            fonograma.AtualizadoEm
        );
    }
}
