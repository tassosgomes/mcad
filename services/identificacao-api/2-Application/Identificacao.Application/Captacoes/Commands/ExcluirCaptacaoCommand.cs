using Identificacao.Application.Common;
using FluentValidation;

namespace Identificacao.Application.Captacoes.Commands;

public record ExcluirCaptacaoCommand(
    Guid Id,
    Guid AnalistaId
) : ICommand<Unit>;

public class ExcluirCaptacaoCommandValidator : AbstractValidator<ExcluirCaptacaoCommand>
{
    public ExcluirCaptacaoCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AnalistaId).NotEmpty();
    }
}
