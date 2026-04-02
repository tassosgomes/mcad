using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;
using FluentValidation;

namespace Identificacao.Application.Captacoes.Commands;

public record AtualizarCaptacaoCommand(
    Guid Id,
    Guid RubricaId,
    DateOnly Periodo,
    string UsuarioDeMusica,
    Guid AnalistaId
) : ICommand<CaptacaoResponse>;

public class AtualizarCaptacaoCommandValidator : AbstractValidator<AtualizarCaptacaoCommand>
{
    public AtualizarCaptacaoCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.RubricaId).NotEmpty();
        RuleFor(x => x.Periodo).NotEmpty();
        RuleFor(x => x.UsuarioDeMusica).NotEmpty().MaximumLength(255);
        RuleFor(x => x.AnalistaId).NotEmpty();
    }
}
