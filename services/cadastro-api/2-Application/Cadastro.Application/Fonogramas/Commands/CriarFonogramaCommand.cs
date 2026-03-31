using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Fonogramas.Commands;

public record CriarFonogramaCommand(
    string Isrc,
    Guid ObraId,
    string PaisOrigem,
    DateOnly? DataGravacao,
    DateOnly? DataLancamento
) : ICommand<FonogramaResponse>;

public class CriarFonogramaCommandValidator : AbstractValidator<CriarFonogramaCommand>
{
    public CriarFonogramaCommandValidator()
    {
        RuleFor(x => x.Isrc)
            .NotEmpty().WithMessage("ISRC é obrigatório.")
            .Length(12).WithMessage("ISRC deve ter 12 caracteres (sem hífens).");

        RuleFor(x => x.ObraId)
            .NotEmpty().WithMessage("ID da obra é obrigatório.");

        RuleFor(x => x.PaisOrigem)
            .NotEmpty().WithMessage("País de origem é obrigatório.")
            .MaximumLength(100).WithMessage("País de origem deve ter no máximo 100 caracteres.");
    }
}

public class CriarFonogramaCommandHandler : ICommandHandler<CriarFonogramaCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IObraRepository _obraRepository;

    public CriarFonogramaCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IObraRepository obraRepository)
    {
        _fonogramaRepository = fonogramaRepository;
        _obraRepository = obraRepository;
    }

    public async Task<FonogramaResponse> HandleAsync(CriarFonogramaCommand command, CancellationToken cancellationToken)
    {
        var isrc = Isrc.Create(command.Isrc);

        if (await _fonogramaRepository.ExisteIsrcAsync(isrc.Valor, cancellationToken))
        {
            throw new ConflictException($"Já existe um fonograma com o ISRC '{isrc.Formatado}'.");
        }

        var obra = await _obraRepository.GetByIdAsync(command.ObraId, cancellationToken);
        if (obra == null)
        {
            throw new NotFoundException($"Obra não encontrada.", command.ObraId);
        }

        var fonograma = Fonograma.Criar(
            isrc,
            command.ObraId,
            command.PaisOrigem,
            command.DataGravacao,
            command.DataLancamento
        );

        await _fonogramaRepository.AddAsync(fonograma, cancellationToken);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        var obraStatus = obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : obra.Status.ToString().ToUpperInvariant();
        var fStatus = fonograma.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                      fonograma.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                      fonograma.Status.ToString().ToUpperInvariant();

        return new FonogramaResponse(
            fonograma.Id,
            fonograma.Isrc.Valor,
            fonograma.Isrc.Formatado,
            new ObraResumoResponse(obra.Id, obra.Titulo, obraStatus),
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
