using Cadastro.Domain.Enums;
using FluentValidation;

namespace Cadastro.Application.Titularidades.Commands;

public class AdicionarTitularidadeCommandValidator : AbstractValidator<AdicionarTitularidadeCommand>
{
    public AdicionarTitularidadeCommandValidator()
    {
        RuleFor(x => x.ObraId).NotEmpty();
        RuleFor(x => x.TitularId).NotEmpty();
        RuleFor(x => x.Categoria)
            .NotEmpty()
            .Must(c => Enum.TryParse<CategoriaAutoral>(c, true, out _))
            .WithMessage("Categoria deve ser 'AUTOR' ou 'EDITOR'");
        RuleFor(x => x.Percentual)
            .GreaterThan(0)
            .LessThanOrEqualTo(100);
    }
}
