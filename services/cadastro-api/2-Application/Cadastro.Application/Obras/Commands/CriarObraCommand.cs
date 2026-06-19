using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Obras.Commands;

public record CriarObraCommand(string Titulo, string? Subtitulo, string Tipo, string? Genero) : ICommand<ObraResponse>;

internal static class TipoObraParser
{
    public static bool TryParse(string? value, out TipoObra tipo)
    {
        tipo = default;
        return !string.IsNullOrWhiteSpace(value)
            && Enum.TryParse<TipoObra>(value.Replace("_", ""), true, out tipo);
    }

    public static TipoObra Parse(string value)
    {
        return Enum.Parse<TipoObra>(value.Replace("_", ""), true);
    }
}

public class CriarObraCommandValidator : AbstractValidator<CriarObraCommand>
{
    public CriarObraCommandValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty()
            .WithMessage("Título é obrigatório.")
            .MaximumLength(300);
        RuleFor(x => x.Subtitulo).MaximumLength(300);
        RuleFor(x => x.Tipo)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithMessage("Tipo é obrigatório.")
            .Must(t => TipoObraParser.TryParse(t, out _))
            .WithMessage("Tipo inválido. Valores aceitos: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI");
        RuleFor(x => x.Genero).MaximumLength(100);
    }
}

public class CriarObraCommandHandler : ICommandHandler<CriarObraCommand, ObraResponse>
{
    private readonly IObraRepository _repository;
    private readonly IObraAuditPublisher _auditPublisher;

    public CriarObraCommandHandler(IObraRepository repository, IObraAuditPublisher auditPublisher)
    {
        _repository = repository;
        _auditPublisher = auditPublisher;
    }

    public async Task<ObraResponse> HandleAsync(CriarObraCommand request, CancellationToken cancellationToken)
    {
        var tipo = TipoObraParser.Parse(request.Tipo);
        var obra = ObraMusical.Criar(request.Titulo, tipo, request.Subtitulo, request.Genero);

        await _repository.AddAsync(obra, cancellationToken);
        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.Create, before: null, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
