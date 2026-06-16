using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;
using FluentValidation;

namespace Identificacao.Application.Captacoes.Commands;

public record CriarCaptacaoCommand(
    Guid RubricaId,
    DateOnly Periodo,
    Guid UsuarioMusicaId,
    string UsuarioMusicaNome,
    Guid AnalistaId,
    string AnalistaSubject,
    string? AnalistaNomeClaim
) : ICommand<CaptacaoResponse>;

public class CriarCaptacaoCommandValidator : AbstractValidator<CriarCaptacaoCommand>
{
    public CriarCaptacaoCommandValidator()
    {
        RuleFor(x => x.RubricaId).NotEmpty();
        RuleFor(x => x.Periodo).NotEmpty();
        RuleFor(x => x.UsuarioMusicaId).NotEmpty();
        RuleFor(x => x.UsuarioMusicaNome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.AnalistaId).NotEmpty();
        RuleFor(x => x.AnalistaSubject).NotEmpty();
    }
}
