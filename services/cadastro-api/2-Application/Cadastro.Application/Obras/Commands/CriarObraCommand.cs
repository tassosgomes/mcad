using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Obras.Commands;

public record CriarObraCommand(string Titulo, string? Subtitulo, string Tipo, string? Genero) : ICommand<ObraResponse>;

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
            .Must(t => !string.IsNullOrWhiteSpace(t) && Enum.TryParse<TipoObra>(t.Replace("_", ""), true, out _))
            .WithMessage("Tipo inválido. Valores aceitos: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI");
        RuleFor(x => x.Genero).MaximumLength(100);
    }
}

public class CriarObraCommandHandler : ICommandHandler<CriarObraCommand, ObraResponse>
{
    private readonly IObraRepository _repository;

    public CriarObraCommandHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<ObraResponse> HandleAsync(CriarObraCommand request, CancellationToken cancellationToken)
    {
        var tipo = Enum.Parse<TipoObra>(request.Tipo.Replace("_", ""), true);
        var obra = ObraMusical.Criar(request.Titulo, tipo, request.Subtitulo, request.Genero);

        await _repository.AddAsync(obra, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
