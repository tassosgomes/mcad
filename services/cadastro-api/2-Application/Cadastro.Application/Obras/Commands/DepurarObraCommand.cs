using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record DepurarObraCommand(Guid Id, string Titulo, string Tipo, string? Subtitulo, string? Genero) : ICommand<DepuracaoResponse>;

public class DepurarObraCommandHandler : ICommandHandler<DepurarObraCommand, DepuracaoResponse>
{
    private readonly IObraRepository _repository;

    public DepurarObraCommandHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<DepuracaoResponse> HandleAsync(DepurarObraCommand request, CancellationToken cancellationToken)
    {
        var obraOriginal = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obraOriginal.Status != StatusObra.Liberado)
            throw new ConflictException("Apenas obras LIBERADAS podem ser depuradas.");

        var novaObraTipo = Enum.Parse<TipoObra>(request.Tipo.Replace("_", ""), true);
        var novaObra = ObraMusical.Criar(request.Titulo, novaObraTipo, request.Subtitulo, request.Genero);

        obraOriginal.Depurar(novaObra.Id);

        _repository.Update(obraOriginal);
        await _repository.AddAsync(novaObra, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return new DepuracaoResponse(
            ObraDepurada: ListarObrasQueryHandler.MapToResponse(obraOriginal),
            NovaObra: ListarObrasQueryHandler.MapToResponse(novaObra)
        );
    }
}
