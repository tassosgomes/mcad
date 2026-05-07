using FluentValidation;

namespace Cadastro.Application.Titularidades.Commands;

public class EditarTitularidadeCommandValidator : AbstractValidator<EditarTitularidadeCommand>
{
    public EditarTitularidadeCommandValidator()
    {
        RuleFor(x => x.ObraId).NotEmpty();
        RuleFor(x => x.Id).NotEmpty();
    }
}
