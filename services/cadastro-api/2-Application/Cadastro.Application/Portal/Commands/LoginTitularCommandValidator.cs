using FluentValidation;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="LoginTitularCommand"/>.
/// Valida apenas que os campos estão preenchidos — a validação algorítmica
/// de CPF/CNPJ é feita no handler via VOs. Mensagem de erro é genérica para
/// não revelar qual campo está incorreto (RF-06).
/// </summary>
public class LoginTitularCommandValidator : AbstractValidator<LoginTitularCommand>
{
    public LoginTitularCommandValidator()
    {
        RuleFor(x => x.Documento)
            .NotEmpty().WithMessage("Documento é obrigatório");

        RuleFor(x => x.Senha)
            .NotEmpty().WithMessage("Senha é obrigatória");
    }
}
