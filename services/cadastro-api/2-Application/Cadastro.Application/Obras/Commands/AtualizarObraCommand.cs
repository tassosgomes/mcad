using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Obras.Commands;

public record AtualizarObraCommand(Guid Id, string Titulo, string? Subtitulo, string Tipo, string? Genero) : ICommand<ObraResponse>;

public class AtualizarObraCommandValidator : AbstractValidator<AtualizarObraCommand>
{
    public AtualizarObraCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
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
            .WithMessage("Tipo inválido.");
        RuleFor(x => x.Genero).MaximumLength(100);
    }
}

public class AtualizarObraCommandHandler : ICommandHandler<AtualizarObraCommand, ObraResponse>
{
    private readonly IObraRepository _repository;

    public AtualizarObraCommandHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<ObraResponse> HandleAsync(AtualizarObraCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obra.RequerDepuracao(request.Titulo))
            throw new DepuracaoNecessariaException("Alterar o título requer depuração");

        var tipo = Enum.Parse<TipoObra>(request.Tipo.Replace("_", ""), true);
        
        obra.Atualizar(request.Titulo, request.Subtitulo, tipo, request.Genero);
        
        _repository.Update(obra);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
