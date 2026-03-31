using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Fonogramas.Commands;

public record ExcluirFonogramaCommand(Guid Id) : ICommand<bool>;

public class ExcluirFonogramaCommandHandler : ICommandHandler<ExcluirFonogramaCommand, bool>
{
    private readonly IFonogramaRepository _fonogramaRepository;

    public ExcluirFonogramaCommandHandler(IFonogramaRepository fonogramaRepository)
    {
        _fonogramaRepository = fonogramaRepository;
    }

    public async Task<bool> HandleAsync(ExcluirFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken);

        if (fonograma == null)
            throw new NotFoundException("Fonograma não encontrado.", command.Id);

        if (!fonograma.PodeSerExcluido)
            throw new ConflictException("Fonogramas liberados ou depurados não podem ser excluídos.");

        _fonogramaRepository.Delete(fonograma);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        return true;
    }
}
