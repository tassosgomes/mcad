using FluentValidation;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="CriarOcorrenciaCommand"/> (RF-27).
/// <para>
/// Regras estruturais:
/// - <c>TitularId</c>: obrigatório (não <c>Guid.Empty</c>).
/// - <c>Tipo</c>: deve mapear para um valor válido de <see cref="Cadastro.Domain.Enums.TipoOcorrencia"/>
///   em SCREAMING_SNAKE_CASE.
/// - <c>Descricao</c>: não vazia, mín. 10, máx. 2000 caracteres.
/// - <c>ObraId</c>/<c>FonogramaId</c>: mutuamente opcionais (pelo menos um pode ser null).
/// </para>
/// </summary>
public class CriarOcorrenciaCommandValidator : AbstractValidator<CriarOcorrenciaCommand>
{
    /// <summary>Conjunto de valores aceitos para <c>Tipo</c> em SCREAMING_SNAKE_CASE.</summary>
    public static readonly HashSet<string> TiposValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "TITULARIDADE_DIVERGENTE",
        "FONOGRAMA_INCORRETO",
        "DADO_CADASTRAL",
        "OBRA_AUSENTE"
    };

    public CriarOcorrenciaCommandValidator()
    {
        RuleFor(x => x.TitularId)
            .NotEqual(Guid.Empty).WithMessage("TitularId é obrigatório");

        RuleFor(x => x.Tipo)
            .NotEmpty().WithMessage("Tipo é obrigatório")
            .Must(t => TiposValidos.Contains(t ?? string.Empty))
            .WithMessage("Tipo inválido (use TITULARIDADE_DIVERGENTE, FONOGRAMA_INCORRETO, DADO_CADASTRAL ou OBRA_AUSENTE)");

        RuleFor(x => x.Descricao)
            .NotEmpty().WithMessage("Descrição é obrigatória")
            .MinimumLength(10).WithMessage("Descrição deve ter no mínimo 10 caracteres")
            .MaximumLength(2000).WithMessage("Descrição deve ter no máximo 2000 caracteres");

        // ObraId/FonogramaId mutuamente opcionais — não há regra de "pelo menos um"
        // (caso de "DADO_CADASTRAL" pode não referenciar nenhum dos dois).
    }
}
