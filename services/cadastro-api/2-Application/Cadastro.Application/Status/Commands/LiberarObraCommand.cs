using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;

namespace Cadastro.Application.Status.Commands;

public record LiberarObraCommand(Guid Id) : ICommand<ObraResponse>;

public class LiberarObraCommandHandler : ICommandHandler<LiberarObraCommand, ObraResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly ITitularidadeRepository _titularidadeRepository;

    public LiberarObraCommandHandler(IObraRepository obraRepository, ITitularidadeRepository titularidadeRepository)
    {
        _obraRepository = obraRepository;
        _titularidadeRepository = titularidadeRepository;
    }

    public async Task<ObraResponse> HandleAsync(LiberarObraCommand command, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(ObraMusical), command.Id);

        if (obra.Status != StatusObra.Pendente)
        {
            throw new ConflictException("Apenas obras PENDENTES podem ser liberadas.");
        }

        var titularidades = await _titularidadeRepository.GetByObraIdAsync(obra.Id, cancellationToken);
        var somaTitularidades = titularidades.Sum(t => t.Percentual);
        bool temIswc = !string.IsNullOrWhiteSpace(obra.Iswc);

        var pendencias = ValidadorLiberacaoObra.Validar(obra, somaTitularidades, temIswc);

        if (pendencias.Any(p => !p.Atendido))
        {
            throw new PreRequisitosException("Não é possível liberar. Existem pendências.", pendencias);
        }

        obra.Liberar();
        _obraRepository.Update(obra);
        await _obraRepository.SaveChangesAsync(cancellationToken);

        return new ObraResponse(
            obra.Id,
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
