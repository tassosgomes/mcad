using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de atualização dos dados de contato do titular autenticado (RF-09 a RF-13).
/// <para>
/// Pipeline:
/// 1. Carrega titular tracked via <c>GetByIdForUpdateAsync</c> (RF-10: alteração reflete imediatamente).
/// 2. Captura snapshot "antes" da auditoria <b>antes</b> da mutação (RF-12).
/// 3. Constrói VOs (Email/Endereco/TelefoneTitular) — <c>DomainException</c> (422) se formato inválido (RF-11).
/// 4. <c>titular.AtualizarContato(...)</c> — domínio impõe invariantes (cap 5, etc.).
/// 5. Publica auditoria two-tier com diff before/after.
/// 6. Registra evento outbox <c>cadastro.titular.contato.atualizado</c> (RF-13).
/// 7. <c>SaveChangesAsync</c> atômico (entidade + outbox + audit).
/// </para>
/// </summary>
public class AtualizarContatoCommandHandler : ICommandHandler<AtualizarContatoCommand, ContatoResponse>
{
    private readonly ITitularRepository _titularRepository;
    private readonly IValidator<AtualizarContatoCommand> _validator;
    private readonly ITitularAuditPublisher _auditPublisher;
    private readonly IOutboxEventWriter _outbox;
    private readonly ILogger<AtualizarContatoCommandHandler> _logger;

    public AtualizarContatoCommandHandler(
        ITitularRepository titularRepository,
        IValidator<AtualizarContatoCommand> validator,
        ITitularAuditPublisher auditPublisher,
        IOutboxEventWriter outbox,
        ILogger<AtualizarContatoCommandHandler> logger)
    {
        _titularRepository = titularRepository;
        _validator = validator;
        _auditPublisher = auditPublisher;
        _outbox = outbox;
        _logger = logger;
    }

    public async Task<ContatoResponse> HandleAsync(
        AtualizarContatoCommand command, CancellationToken cancellationToken)
    {
        // 1. Validação estrutural (FluentValidation) — formato algorítmico fica nos VOs.
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = command.TitularId });

        // 2. Carregar titular COM rastreamento (tracking) — RF-10: alteração imediata.
        //    Tracked para que o EF Core detecte mudanças em Email, Endereco (Owned) e Telefones (OwnedMany).
        var titular = await _titularRepository.GetByIdForUpdateAsync(command.TitularId, cancellationToken)
            ?? throw new NotFoundException("Titular", command.TitularId);

        // 3. RF-12: capturar snapshot "antes" ANTES de qualquer mutação.
        //    O TitularAuditEventFactory produz o diff comparando este snapshot com o estado pós-mutação.
        var before = _auditPublisher.Snapshot(titular);

        // 4. Construir VOs — DomainException (422) propagada se formato inválido (RF-11).
        var email = !string.IsNullOrWhiteSpace(command.Email)
            ? Email.Create(command.Email)
            : null;

        Endereco? endereco = null;
        if (command.Endereco is not null)
        {
            var dto = command.Endereco;
            endereco = Endereco.Create(
                Cep.Create(dto.Cep),
                dto.Logradouro,
                dto.Numero,
                dto.Complemento,
                dto.Bairro,
                dto.Cidade,
                Uf.Create(dto.Uf));
        }

        var telefones = (command.Telefones ?? [])
            .Select(t => new TelefoneTitular(
                Enum.Parse<TipoTelefone>(t.Tipo, ignoreCase: true),
                Telefone.Create(t.Numero)))
            .ToList();

        // 5. Aplicar mutação — domínio valida cap 5 e invariantes (RF-11).
        titular.AtualizarContato(email, endereco, telefones);

        // 6. Auditoria two-tier com diff before/after (RF-12).
        await _auditPublisher.PublishAsync(
            titular,
            TitularAuditOperation.AtualizarContato,
            before,
            cancellationToken);

        // 7. Evento outbox — atômico com SaveChanges (RF-13).
        //    String literal (não constante de Infra) para respeitar Clean Architecture:
        //    Application não referencia Infra. O valor bate com EventTypes.TitularContatoAtualizado.
        _outbox.AddEvent(
            "cadastro.titular.contato.atualizado",
            titular.Id.ToString(),
            new
            {
                titularId = titular.Id,
                email = titular.Email?.Valor,
                atualizadoEm = titular.AtualizadoEm
            });

        // 8. Persistência atômica (entidade + outbox + audit no mesmo SaveChanges).
        await _titularRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Contato do titular atualizado via Portal");

        // 9. Response com dados atualizados.
        return MapToContatoResponse(titular);
    }

    private static ContatoResponse MapToContatoResponse(Domain.Entities.Titular titular)
    {
        EnderecoDto? enderecoDto = null;
        if (titular.Endereco is not null)
        {
            var e = titular.Endereco;
            enderecoDto = new EnderecoDto(
                e.Cep.Valor,
                e.Logradouro,
                e.Numero,
                e.Complemento,
                e.Bairro,
                e.Cidade,
                e.Uf.Valor);
        }

        var telefonesDto = titular.Telefones
            .Select(t => new TelefoneDto(t.Tipo.ToString().ToUpperInvariant(), t.Numero.Valor))
            .ToList();

        return new ContatoResponse(
            titular.Email?.Valor,
            enderecoDto,
            telefonesDto);
    }
}
