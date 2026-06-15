using FluentValidation;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="AutoCadastroTitularCommand"/>.
/// Valida shape e campos obrigatórios antes do handler.
/// A validação algorítmica de CPF/CNPJ é feita no handler via Value Objects
/// (Cpf.Create / Cnpj.Create) — dispara <c>DomainException</c> se inválido.
/// </summary>
public class AutoCadastroTitularCommandValidator : AbstractValidator<AutoCadastroTitularCommand>
{
    public AutoCadastroTitularCommandValidator()
    {
        RuleFor(x => x.Documento)
            .NotEmpty().WithMessage("Documento é obrigatório");

        RuleFor(x => x.CaeIpi)
            .NotEmpty().WithMessage("CAE/IPI é obrigatório")
            .MaximumLength(20).WithMessage("CAE/IPI deve ter no máximo 20 caracteres");

        RuleFor(x => x.Senha)
            .NotEmpty().WithMessage("Senha é obrigatória")
            .MinimumLength(8).WithMessage("Senha deve ter no mínimo 8 caracteres");
    }
}
