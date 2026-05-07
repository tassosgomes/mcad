using Cadastro.Application.Audit;
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
    private readonly ITitularidadeRepository _titularidadeRepository;
    private readonly IOutboxEventWriter _outbox;
    private readonly IObraAuditPublisher _auditPublisher;

    public DepurarObraCommandHandler(
        IObraRepository repository,
        ITitularidadeRepository titularidadeRepository,
        IOutboxEventWriter outbox,
        IObraAuditPublisher auditPublisher)
    {
        _repository = repository;
        _titularidadeRepository = titularidadeRepository;
        _outbox = outbox;
        _auditPublisher = auditPublisher;
    }

    public async Task<DepuracaoResponse> HandleAsync(DepurarObraCommand request, CancellationToken cancellationToken)
    {
        var obraOriginal = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obraOriginal.Status != StatusObra.Liberado)
            throw new ConflictException("Apenas obras LIBERADAS podem ser depuradas.");

        var novaObraTipo = Enum.Parse<TipoObra>(request.Tipo.Replace("_", ""), true);
        var novaObra = ObraMusical.Criar(request.Titulo, novaObraTipo, request.Subtitulo, request.Genero);
        var titularidadesOriginais = (await _titularidadeRepository
            .GetByObraIdAsync(obraOriginal.Id, cancellationToken))
            .ToList();

        // Captura o ISWC original antes da depuração
        var iswcOriginal = obraOriginal.Iswc;
        var before = _auditPublisher.Snapshot(obraOriginal);

        obraOriginal.Depurar(novaObra.Id);

        _repository.Update(obraOriginal);
        await _repository.AddAsync(novaObra, cancellationToken);

        foreach (var titularidadeOriginal in titularidadesOriginais)
        {
            var novaTitularidade = TitularidadeAutoral.Criar(
                novaObra.Id,
                titularidadeOriginal.TitularId,
                titularidadeOriginal.Categoria,
                titularidadeOriginal.Percentual);

            await _titularidadeRepository.AddAsync(novaTitularidade, cancellationToken);
        }

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.obra.depurada", obraOriginal.Id.ToString(), new
        {
            obraId = obraOriginal.Id,
            titulo = obraOriginal.Titulo,
            iswcOriginal,
            novaObraId = novaObra.Id,
        });

        await _auditPublisher.PublishAsync(obraOriginal, ObraAuditOperation.Depurate, before, cancellationToken);
        await _auditPublisher.PublishAsync(novaObra, ObraAuditOperation.Create, before: null, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return new DepuracaoResponse(
            ObraDepurada: ListarObrasQueryHandler.MapToResponse(obraOriginal),
            NovaObra: ListarObrasQueryHandler.MapToResponse(novaObra)
        );
    }
}
