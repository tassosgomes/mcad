using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;
using FluentValidation;

namespace Identificacao.Application.Captacoes.Commands;

public record AtualizarCaptacaoCommand(
    Guid Id,
    Guid RubricaId,
    DateOnly Periodo,
    Guid UsuarioMusicaId,
    string UsuarioMusicaNome,
    Guid AnalistaId
) : ICommand<CaptacaoResponse>;

public class AtualizarCaptacaoCommandValidator : AbstractValidator<AtualizarCaptacaoCommand>
{
    public AtualizarCaptacaoCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.RubricaId).NotEmpty();
        RuleFor(x => x.Periodo).NotEmpty();
        RuleFor(x => x.UsuarioMusicaId).NotEmpty();
        RuleFor(x => x.UsuarioMusicaNome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.AnalistaId).NotEmpty();
    }
}
