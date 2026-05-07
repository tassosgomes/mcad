using Cadastro.Application.Audit;
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
    private readonly IOutboxEventWriter _outbox;
    private readonly IObraAuditPublisher _auditPublisher;

    public ObterIswcCommandHandler(
        IObraRepository repository,
        IIswcService iswcService,
        ITitularidadeRepository titularidadeRepository,
        IOutboxEventWriter outbox,
        IObraAuditPublisher auditPublisher)
    {
        _repository = repository;
        _iswcService = iswcService;
        _titularidadeRepository = titularidadeRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
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

        var before = _auditPublisher.Snapshot(obra);
        obra.AtribuirIswc(iswc);
        _repository.Update(obra);

        // Registrar evento na outbox — mesma transação (RF-17)
        // AtribuirIswc muda o status para Liberado
        _outbox.AddEvent("cadastro.obra.liberada", obra.Id.ToString(), new
        {
            obraId = obra.Id,
            titulo = obra.Titulo,
            iswc = obra.Iswc,
        });

        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.ObtainIswc, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
