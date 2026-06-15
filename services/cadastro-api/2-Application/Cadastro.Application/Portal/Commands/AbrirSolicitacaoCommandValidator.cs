using FluentValidation;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Validator FluentValidation para <see cref="AbrirSolicitacaoCommand"/>.
/// Faz validação estrutural mínima:
/// <list type="bullet">
///   <item><c>TitularId</c> não pode ser <c>Guid.Empty</c> (anti-tampering).</item>
///   <item><c>Campo</c> deve ser um dos valores válidos do enum <c>CampoSolicitacao</c>
///         em SCREAMING_SNAKE_CASE (<c>NOME</c>, <c>CAE_IPI</c>, <c>ASSOCIACAO</c>, <c>CATEGORIA</c>).</item>
///   <item><c>ValorPretendido</c> é obrigatório; quando <c>Campo == ASSOCIACAO</c> deve ser
///         um GUID válido não-vazio (defense in depth para RF-20 — o domínio valida novamente).</item>
///   <item><c>Justificativa</c> mínimo 10 caracteres, máximo 2000.</item>
/// </list>
/// </summary>
public class AbrirSolicitacaoCommandValidator : AbstractValidator<AbrirSolicitacaoCommand>
{
    private static readonly HashSet<string> CamposValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "NOME", "CAE_IPI", "ASSOCIACAO", "CATEGORIA"
    };

    private const int JustificativaMin = 10;
    private const int JustificativaMax = 2000;
    private const int ValorPretendidoMax = 500;

    public AbrirSolicitacaoCommandValidator()
    {
        RuleFor(x => x.TitularId)
            .NotEqual(Guid.Empty).WithMessage("TitularId é obrigatório");

        RuleFor(x => x.Campo)
            .NotEmpty().WithMessage("Campo é obrigatório")
            .Must(c => CamposValidos.Contains(c ?? string.Empty))
            .WithMessage("Campo inválido (use NOME, CAE_IPI, ASSOCIACAO ou CATEGORIA)");

        // RF-20 (defense in depth): quando Campo == ASSOCIACAO, ValorPretendido deve ser um GUID não-vazio.
        // O domínio revalida esta regra em SolicitacaoAlteracao.Criar.
        When(x => IsAssociacao(x.Campo), () =>
        {
            RuleFor(x => x.ValorPretendido)
                .NotEmpty().WithMessage("Valor pretendido é obrigatório para alteração de associação (RF-20)")
                .Must(BeValidNonEmptyGuid).WithMessage("Valor pretendido deve ser um GUID válido (RF-20)");
        }).Otherwise(() =>
        {
            RuleFor(x => x.ValorPretendido)
                .NotEmpty().WithMessage("Valor pretendido é obrigatório")
                .MaximumLength(ValorPretendidoMax).WithMessage($"Valor pretendido deve ter no máximo {ValorPretendidoMax} caracteres");
        });

        RuleFor(x => x.Justificativa)
            .NotEmpty().WithMessage("Justificativa é obrigatória")
            .MinimumLength(JustificativaMin).WithMessage($"Justificativa deve ter no mínimo {JustificativaMin} caracteres")
            .MaximumLength(JustificativaMax).WithMessage($"Justificativa deve ter no máximo {JustificativaMax} caracteres");
    }

    private static bool IsAssociacao(string? campo) =>
        string.Equals(campo, "ASSOCIACAO", StringComparison.OrdinalIgnoreCase);

    private static bool BeValidNonEmptyGuid(string? value) =>
        Guid.TryParse(value, out var guid) && guid != Guid.Empty;
}
