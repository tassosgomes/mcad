using FluentValidation;

namespace Identificacao.Application.Execucoes.Commands;

public class CriarExecucaoCommandValidator : AbstractValidator<CriarExecucaoCommand>
{
    public CriarExecucaoCommandValidator()
    {
        RuleFor(x => x.CaptacaoId).NotEmpty();
        RuleFor(x => x.ObraId).NotEmpty();
        RuleFor(x => x.Inicio).NotEmpty();
        RuleFor(x => x.Fim).NotEmpty();
        RuleFor(x => x.Quantidade).GreaterThanOrEqualTo(1);
        RuleFor(x => x.TituloPrograma).MaximumLength(255).When(x => x.TituloPrograma != null);
    }
}
