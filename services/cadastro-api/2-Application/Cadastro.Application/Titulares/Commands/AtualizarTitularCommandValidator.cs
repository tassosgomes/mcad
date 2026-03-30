using FluentValidation;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Validator FluentValidation para AtualizarTitularCommand.
/// </summary>
public class AtualizarTitularCommandValidator : AbstractValidator<AtualizarTitularCommand>
{
    private static readonly string[] StatusValidos = ["ATIVO", "FALECIDO", "TRANSFERINDO"];

    public AtualizarTitularCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("ID é obrigatório");

        RuleFor(x => x.Nome)
            .NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.Nacionalidade)
            .NotEmpty().WithMessage("Nacionalidade é obrigatória")
            .MaximumLength(100).WithMessage("Nacionalidade deve ter no máximo 100 caracteres");

        RuleFor(x => x.AssociacaoId)
            .NotEmpty().WithMessage("Associação é obrigatória");

        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status é obrigatório")
            .Must(s => StatusValidos.Contains(s?.ToUpperInvariant()))
            .WithMessage("Status deve ser ATIVO, FALECIDO ou TRANSFERINDO");

        RuleFor(x => x.CaeIpi)
            .MaximumLength(20).WithMessage("CAE/IPI deve ter no máximo 20 caracteres")
            .When(x => x.CaeIpi != null);
    }
}
