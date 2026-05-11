using FluentValidation;
using Identificacao.Application.Cancelamento.Responses;
using Identificacao.Application.Common;

namespace Identificacao.Application.Cancelamento.Commands;

public record CancelarRolCommand(
    Guid CaptacaoId,
    string Justificativa,
    string OpcaoRecriacao,
    Guid AnalistaId,
    string AnalistaNome
) : ICommand<CancelamentoResponse>;

public static class OpcoesRecriacao
{
    public const string CopiarExecucoes = "COPIAR_EXECUCOES";
    public const string RecriarVazia = "RECRIAR_VAZIA";
    public const string ApenasCancelar = "APENAS_CANCELAR";

    public static readonly string[] Todas = [CopiarExecucoes, RecriarVazia, ApenasCancelar];
}

public class CancelarRolCommandValidator : AbstractValidator<CancelarRolCommand>
{
    public CancelarRolCommandValidator()
    {
        RuleFor(x => x.CaptacaoId).NotEmpty();
        RuleFor(x => x.AnalistaId).NotEmpty();
        RuleFor(x => x.Justificativa)
            .NotEmpty()
            .MinimumLength(10)
            .MaximumLength(1000)
            .WithName("justificativa");
        RuleFor(x => x.OpcaoRecriacao)
            .Must(o => OpcoesRecriacao.Todas.Contains(o))
            .WithMessage("opcaoRecriacao deve ser COPIAR_EXECUCOES, RECRIAR_VAZIA ou APENAS_CANCELAR")
            .WithName("opcaoRecriacao");
    }
}
