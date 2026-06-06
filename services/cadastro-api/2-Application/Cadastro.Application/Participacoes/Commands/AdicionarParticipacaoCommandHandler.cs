using Cadastro.Application.Audit;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Queries;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Participacoes.Commands;

public class AdicionarParticipacaoCommandHandler : ICommandHandler<AdicionarParticipacaoCommand, ParticipacoesResponse>
{
    private readonly IParticipacaoRepository _repository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ITitularRepository _titularRepository;
    private readonly IParticipacaoAuditPublisher _auditPublisher;
    private readonly ICurrentUserPermissions _permissions;

    public AdicionarParticipacaoCommandHandler(
        IParticipacaoRepository repository,
        IFonogramaRepository fonogramaRepository,
        ITitularRepository titularRepository,
        IParticipacaoAuditPublisher auditPublisher,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _fonogramaRepository = fonogramaRepository;
        _titularRepository = titularRepository;
        _auditPublisher = auditPublisher;
        _permissions = permissions;
    }

    public async Task<ParticipacoesResponse> HandleAsync(AdicionarParticipacaoCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.FonogramaId, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), command.FonogramaId);

        if (fonograma.Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser alterados");
        if (fonograma.Status == StatusFonograma.Liberado)
            throw new DepuracaoNecessariaException("Adicionar participação em fonograma LIBERADO requer depuração");

        var titular = await _titularRepository.GetByIdAsync(command.TitularId, cancellationToken)
            ?? throw new NotFoundException(nameof(Titular), command.TitularId);

        if (!TryParseCategoriaConexo(command.Categoria, out var categoria))
            throw new DomainException($"Categoria inválida: '{command.Categoria}'. Use INTERPRETE, PRODUTOR_FONOGRAFICO ou MUSICO_EXECUTANTE");

        if (await _repository.ExisteDuplicataAsync(command.FonogramaId, command.TitularId, categoria, cancellationToken))
            throw new ConflictException("Este titular já está vinculado com esta categoria neste fonograma");

        var participacao = ParticipacaoConexa.Criar(command.FonogramaId, command.TitularId, categoria);
        await _repository.AddAsync(participacao, cancellationToken);
        await _auditPublisher.PublishAsync(participacao, ParticipacaoAuditOperation.Add, before: null, cancellationToken);

        // Marcar desatualizados se já havia cálculo anterior
        var todasAntes = (await _repository.GetByFonogramaIdAsync(command.FonogramaId, cancellationToken)).ToList();
        bool tinhaCalculo = todasAntes.Any(p => p.Percentual.HasValue);
        if (tinhaCalculo)
        {
            fonograma.MarcarPercentuaisDesatualizados();
            _fonogramaRepository.Update(fonograma);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        var todas = (await _repository.GetByFonogramaIdAsync(command.FonogramaId, cancellationToken)).ToList();
        var fullDocumentAllowed = await _permissions.HasAsync(CadastroPermissionNames.TitularVerCpfCompleto);
        return ListarParticipacoesQueryHandler.BuildResponse(
            command.FonogramaId,
            todas,
            fonograma.PercentuaisDesatualizados,
            fullDocumentAllowed);
    }

    internal static bool TryParseCategoriaConexo(string value, out CategoriaConexo categoria)
    {
        categoria = value?.ToUpperInvariant() switch
        {
            "INTERPRETE"           => CategoriaConexo.Interprete,
            "PRODUTOR_FONOGRAFICO" => CategoriaConexo.ProdutorFonografico,
            "MUSICO_EXECUTANTE"    => CategoriaConexo.MusicoExecutante,
            _                      => (CategoriaConexo)(-1)
        };
        return (int)categoria >= 0;
    }
}
