using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Status.Commands;

public record DefinirUrlAudioCommand(Guid Id, string? Url) : ICommand<FonogramaResponse>;

public class DefinirUrlAudioCommandValidator : AbstractValidator<DefinirUrlAudioCommand>
{
    public DefinirUrlAudioCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("ID do fonograma é obrigatório.");
        RuleFor(x => x.Url)
            .MaximumLength(500).WithMessage("A URL de áudio deve ter no máximo 500 caracteres.");
    }
}

public class DefinirUrlAudioCommandHandler : ICommandHandler<DefinirUrlAudioCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;

    public DefinirUrlAudioCommandHandler(IFonogramaRepository fonogramaRepository)
    {
        _fonogramaRepository = fonogramaRepository;
    }

    public async Task<FonogramaResponse> HandleAsync(DefinirUrlAudioCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.Id);

        fonograma.DefinirUrlAudio(command.Url);

        _fonogramaRepository.Update(fonograma);
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
