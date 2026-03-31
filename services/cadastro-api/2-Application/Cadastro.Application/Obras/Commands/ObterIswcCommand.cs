using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record ObterIswcCommand(Guid Id) : ICommand<ObraResponse>;

public class ObterIswcCommandHandler : ICommandHandler<ObterIswcCommand, ObraResponse>
{
    private readonly IObraRepository _repository;
    private readonly IIswcService _iswcService;

    public ObterIswcCommandHandler(IObraRepository repository, IIswcService iswcService)
    {
        _repository = repository;
        _iswcService = iswcService;
    }

    public async Task<ObraResponse> HandleAsync(ObterIswcCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obra.Status != StatusObra.Pendente)
            throw new DomainException("ISWC só pode ser solicitado para obras PENDENTES.");

        // Placeholder for F04 titularidades check
        // Até F04, o endpoint de ISWC pode retornar 422 "sem titulares" intencionalmente.
        bool hasTitulares = false;
        if (!hasTitulares)
            throw new DomainException("A obra deve ter titulares autorais para obter ISWC.");

        var associacaoSigla = "ABRAMUS"; // placeholder
        var autores = new[] { "Autor Placeholder" }; // placeholder

        var iswc = await _iswcService.ObterIswcAsync(obra.Titulo, autores, associacaoSigla, cancellationToken);

        if (await _repository.ExisteIswcAsync(iswc, cancellationToken))
            throw new ConflictException("O ISWC retornado já está vinculado a outra obra.");

        obra.AtribuirIswc(iswc);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
