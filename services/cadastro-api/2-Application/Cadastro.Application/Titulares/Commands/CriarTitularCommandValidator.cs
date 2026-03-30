using FluentValidation;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Validator FluentValidation para CriarTitularCommand.
/// Valida shape e campos obrigatórios antes do handler.
/// Validação algorítmica de CPF/CNPJ é feita no handler via Value Objects.
/// </summary>
public class CriarTitularCommandValidator : AbstractValidator<CriarTitularCommand>
{
    public CriarTitularCommandValidator()
    {
        RuleFor(x => x.Nome)
            .NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.Tipo)
            .NotEmpty().WithMessage("Tipo é obrigatório")
            .Must(t => t is "PF" or "PJ")
            .WithMessage("Tipo deve ser 'PF' ou 'PJ'");

        RuleFor(x => x.Documento)
            .NotEmpty().WithMessage("Documento é obrigatório")
            .Must(ValidarTamanhoDocumento).When(x => x.Tipo is "PF" or "PJ")
            .WithMessage(x => x.Tipo == "PF"
                ? "CPF deve ter 11 dígitos (sem formatação)"
                : "CNPJ deve ter 14 caracteres (sem formatação)");

        RuleFor(x => x.Nacionalidade)
            .NotEmpty().WithMessage("Nacionalidade é obrigatória")
            .MaximumLength(100).WithMessage("Nacionalidade deve ter no máximo 100 caracteres");

        RuleFor(x => x.AssociacaoId)
            .NotEmpty().WithMessage("Associação é obrigatória");

        RuleFor(x => x.CaeIpi)
            .MaximumLength(20).WithMessage("CAE/IPI deve ter no máximo 20 caracteres")
            .When(x => x.CaeIpi != null);
    }

    private static bool ValidarTamanhoDocumento(CriarTitularCommand command, string documento)
    {
        var limpo = System.Text.RegularExpressions.Regex.Replace(documento ?? "", @"[^a-zA-Z0-9]", "");
        return command.Tipo == "PF" ? limpo.Length == 11 : limpo.Length == 14;
    }
}
