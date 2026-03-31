using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Fonogramas.Commands;

public record AtualizarFonogramaCommand(
    Guid Id,
    string Isrc,
    string PaisOrigem,
    DateOnly? DataGravacao,
    DateOnly? DataLancamento
) : ICommand<FonogramaResponse>;

public class AtualizarFonogramaCommandValidator : AbstractValidator<AtualizarFonogramaCommand>
{
    public AtualizarFonogramaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("ID do fonograma é obrigatório.");
        
        RuleFor(x => x.Isrc)
            .NotEmpty().WithMessage("ISRC é obrigatório.")
            .Length(12).WithMessage("ISRC deve ter 12 caracteres (sem hífens).");

        RuleFor(x => x.PaisOrigem)
            .NotEmpty().WithMessage("País de origem é obrigatório.")
            .MaximumLength(100).WithMessage("País de origem deve ter no máximo 100 caracteres.");
    }
}

public class AtualizarFonogramaCommandHandler : ICommandHandler<AtualizarFonogramaCommand, FonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;

    public AtualizarFonogramaCommandHandler(IFonogramaRepository fonogramaRepository)
    {
        _fonogramaRepository = fonogramaRepository;
    }

    public async Task<FonogramaResponse> HandleAsync(AtualizarFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken);
        if (fonograma == null)
            throw new NotFoundException("Fonograma não encontrado.", command.Id);

        var novoIsrc = Isrc.Create(command.Isrc);

        if (fonograma.RequerDepuracao(novoIsrc))
        {
            throw new DepuracaoNecessariaException("Alterar o ISRC de um fonograma LIBERADO requer depuração.");
        }

        if (novoIsrc.Valor != fonograma.Isrc.Valor && await _fonogramaRepository.ExisteIsrcAsync(novoIsrc.Valor, fonograma.Id, cancellationToken))
        {
            throw new ConflictException($"Já existe um fonograma com o ISRC '{novoIsrc.Formatado}'.");
        }

        fonograma.Atualizar(
            novoIsrc,
            command.PaisOrigem,
            command.DataGravacao,
            command.DataLancamento
        );

        _fonogramaRepository.Update(fonograma);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        var obraStatus = fonograma.Obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : fonograma.Obra.Status.ToString().ToUpperInvariant();
        var fStatus = fonograma.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                      fonograma.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                      fonograma.Status.ToString().ToUpperInvariant();

        return new FonogramaResponse(
            fonograma.Id,
            fonograma.Isrc.Valor,
            fonograma.Isrc.Formatado,
            new ObraResumoResponse(fonograma.Obra.Id, fonograma.Obra.Titulo, obraStatus),
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
