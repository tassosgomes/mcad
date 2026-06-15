using FluentValidation;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="AlterarSenhaCommand"/>.
/// Nova senha deve ter no mínimo 8 caracteres e ser diferente da atual (RF-07).
/// </summary>
public class AlterarSenhaCommandValidator : AbstractValidator<AlterarSenhaCommand>
{
    public AlterarSenhaCommandValidator()
    {
        RuleFor(x => x.TitularId)
            .NotEmpty().WithMessage("TitularId é obrigatório");

        RuleFor(x => x.SenhaAtual)
            .NotEmpty().WithMessage("Senha atual é obrigatória");

        RuleFor(x => x.NovaSenha)
            .NotEmpty().WithMessage("Nova senha é obrigatória")
            .MinimumLength(8).WithMessage("Nova senha deve ter no mínimo 8 caracteres")
            .NotEqual(x => x.SenhaAtual).WithMessage("Nova senha deve ser diferente da senha atual");
    }
}
