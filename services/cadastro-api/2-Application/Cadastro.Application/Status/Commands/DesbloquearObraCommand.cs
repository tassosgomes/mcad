using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Status.Commands;

public record DesbloquearObraCommand(Guid Id) : ICommand<ObraResponse>;

public class DesbloquearObraCommandHandler : ICommandHandler<DesbloquearObraCommand, ObraResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly IHistoricoBloqueioRepository _historicoRepository;

    public DesbloquearObraCommandHandler(IObraRepository obraRepository, IHistoricoBloqueioRepository historicoRepository)
    {
        _obraRepository = obraRepository;
        _historicoRepository = historicoRepository;
    }

    public async Task<ObraResponse> HandleAsync(DesbloquearObraCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.Id);

        obra.Desbloquear();
        
        var historico = HistoricoBloqueio.CriarDesbloqueio("OBRA", obra.Id);
        _historicoRepository.Add(historico);

        _obraRepository.Update(obra);
        await _obraRepository.SaveChangesAsync(cancellationToken);

        return new ObraResponse(
            obra.Id,
            obra.Codigo,
            obra.Titulo,
            obra.Subtitulo,
            obra.Tipo.ToString().ToUpperInvariant(),
            obra.Genero,
            obra.Iswc,
            obra.Status.ToString().ToUpperInvariant(),
            obra.DominioPublico,
            obra.ObraDepuradaParaId,
            obra.CriadoEm,
            obra.AtualizadoEm,
            obra.BloqueioJustificativa
        );
    }
}
