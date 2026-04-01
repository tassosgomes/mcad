using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record AlterarDominioPublicoCommand(Guid Id, bool DominioPublico) : ICommand<ObraResponse>;

public class AlterarDominioPublicoCommandHandler : ICommandHandler<AlterarDominioPublicoCommand, ObraResponse>
{
    private readonly IObraRepository _repository;
    private readonly IOutboxEventWriter _outbox;

    public AlterarDominioPublicoCommandHandler(IObraRepository repository, IOutboxEventWriter outbox)
    {
        _repository = repository;
        _outbox = outbox;
    }

    public async Task<ObraResponse> HandleAsync(AlterarDominioPublicoCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        obra.MarcarDominioPublico(request.DominioPublico);

        _repository.Update(obra);

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.obra.dominio-publico", obra.Id.ToString(), new
        {
            obraId = obra.Id,
            titulo = obra.Titulo,
            dominioPublico = request.DominioPublico,
        });

        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
