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
    private readonly ITitularidadeRepository _titularidadeRepository;

    public ObterIswcCommandHandler(
        IObraRepository repository,
        IIswcService iswcService,
        ITitularidadeRepository titularidadeRepository)
    {
        _repository = repository;
        _iswcService = iswcService;
        _titularidadeRepository = titularidadeRepository;
    }

    public async Task<ObraResponse> HandleAsync(ObterIswcCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obra.Status != StatusObra.Pendente)
            throw new DomainException("ISWC só pode ser solicitado para obras PENDENTES.");

        var titularidades = (await _titularidadeRepository.GetByObraIdAsync(request.Id, cancellationToken)).ToList();
        
        if (!titularidades.Any())
            throw new DomainException("A obra deve ter titulares autorais para obter ISWC.");

        var autores = titularidades
            .Where(t => t.Categoria == CategoriaAutoral.Autor)
            .Select(t => t.Titular.Nome)
            .Distinct()
            .ToArray();

        var maiorTitularidade = titularidades
            .OrderByDescending(t => t.Percentual)
            .ThenBy(t => t.CriadoEm)
            .First();

        var associacaoSigla = maiorTitularidade.Titular.Associacao?.Sigla ?? "UNKNOWN";

        var iswc = await _iswcService.ObterIswcAsync(obra.Titulo, autores, associacaoSigla, cancellationToken);

        if (await _repository.ExisteIswcAsync(iswc, cancellationToken))
            throw new ConflictException("O ISWC retornado já está vinculado a outra obra.");

        obra.AtribuirIswc(iswc);
        _repository.Update(obra);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
