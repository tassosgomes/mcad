using FluentValidation;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="AtualizarContatoCommand"/>.
/// Faz apenas validação estrutural mínima (não-nullos, limites de tamanho, shape).
/// A validação algorítmica (formato de e-mail, CEP, UF, telefone, cap de 5 telefones)
/// é delegada aos Value Objects no handler — dispara <c>DomainException</c> se inválido (RF-11).
/// </summary>
public class AtualizarContatoCommandValidator : AbstractValidator<AtualizarContatoCommand>
{
    private static readonly HashSet<string> TiposValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "CELULAR", "RESIDENCIAL", "COMERCIAL"
    };

    public AtualizarContatoCommandValidator()
    {
        RuleFor(x => x.TitularId)
            .NotEqual(Guid.Empty).WithMessage("TitularId é obrigatório");

        // Email — quando informado, valida limite estrutural (max 254). Formato é validado pelo VO.
        RuleFor(x => x.Email)
            .MaximumLength(254).When(x => !string.IsNullOrWhiteSpace(x.Email))
            .WithMessage("E-mail deve ter no máximo 254 caracteres");

        // Telefones — limite de 5 imposto pelo domínio; validator só checa shape máximo.
        RuleFor(x => x.Telefones)
            .Must(t => t is null || t.Count <= 5)
            .WithMessage("Titular pode ter no máximo 5 telefones");

        When(x => x.Telefones is not null, () =>
        {
            RuleForEach(x => x.Telefones)
                .ChildRules(telefone =>
                {
                    telefone.RuleFor(t => t.Numero)
                        .NotEmpty().WithMessage("Número de telefone é obrigatório")
                        .MaximumLength(20).WithMessage("Número de telefone muito longo");

                    telefone.RuleFor(t => t.Tipo)
                        .NotEmpty().WithMessage("Tipo de telefone é obrigatório")
                        .Must(t => TiposValidos.Contains(t ?? string.Empty))
                        .WithMessage("Tipo de telefone inválido (use CELULAR, RESIDENCIAL ou COMERCIAL)");
                });
        });

        When(x => x.Endereco is not null, () =>
        {
            RuleFor(x => x.Endereco!.Cep)
                .NotEmpty().WithMessage("CEP é obrigatório");

            RuleFor(x => x.Endereco!.Logradouro)
                .NotEmpty().WithMessage("Logradouro é obrigatório")
                .MaximumLength(150).WithMessage("Logradouro deve ter no máximo 150 caracteres");

            RuleFor(x => x.Endereco!.Numero)
                .NotEmpty().WithMessage("Número é obrigatório")
                .MaximumLength(20).WithMessage("Número deve ter no máximo 20 caracteres");

            RuleFor(x => x.Endereco!.Complemento)
                .MaximumLength(150).When(e => !string.IsNullOrWhiteSpace(e.Endereco!.Complemento))
                .WithMessage("Complemento deve ter no máximo 150 caracteres");

            RuleFor(x => x.Endereco!.Bairro)
                .NotEmpty().WithMessage("Bairro é obrigatório")
                .MaximumLength(150).WithMessage("Bairro deve ter no máximo 150 caracteres");

            RuleFor(x => x.Endereco!.Cidade)
                .NotEmpty().WithMessage("Cidade é obrigatória")
                .MaximumLength(150).WithMessage("Cidade deve ter no máximo 150 caracteres");

            RuleFor(x => x.Endereco!.Uf)
                .NotEmpty().WithMessage("UF é obrigatória")
                .Length(2).WithMessage("UF deve ter 2 caracteres");
        });
    }
}
