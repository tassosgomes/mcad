using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Queries;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Handler para atualização dos dados editáveis do titular.
/// Tipo e Documento são imutáveis — não presentes no command (RF-11).
/// </summary>
public class AtualizarTitularCommandHandler : ICommandHandler<AtualizarTitularCommand, TitularResponse>
{
    private readonly ITitularRepository _titularRepository;
    private readonly IAssociacaoRepository _associacaoRepository;
    private readonly IValidator<AtualizarTitularCommand> _validator;

    public AtualizarTitularCommandHandler(
        ITitularRepository titularRepository,
        IAssociacaoRepository associacaoRepository,
        IValidator<AtualizarTitularCommand> validator)
    {
        _titularRepository = titularRepository;
        _associacaoRepository = associacaoRepository;
        _validator = validator;
    }

    public async Task<TitularResponse> HandleAsync(
        AtualizarTitularCommand command, CancellationToken cancellationToken)
    {
        // 1. Validação de campo
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        // 2. Buscar titular COM rastreamento (tracking) para que o EF Core
        //    detecte as alterações em todas as propriedades, incluindo AssociacaoId (FK).
        //    Não usar GetByIdAsync (AsNoTracking) pois o Update() com entidade desanexada
        //    e navigation property nula ignora silenciosamente a mudança de AssociacaoId.
        var titular = await _titularRepository.GetByIdForUpdateAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("Titular", command.Id);

        // 3. Verificar que associação existe
        _ = await _associacaoRepository.GetByIdAsync(command.AssociacaoId, cancellationToken)
            ?? throw new NotFoundException("Associação", command.AssociacaoId);

        // 4. Parsear Status
        var status = Enum.Parse<StatusTitular>(command.Status, ignoreCase: true);

        // 5. Parsear CaeIpi (opcional)
        var caeIpi = !string.IsNullOrWhiteSpace(command.CaeIpi)
            ? CaeIpi.Create(command.CaeIpi)
            : null;

        // 6. Aplicar atualização (Tipo e Documento permanecem imutáveis)
        //    Com tracking ativo, o EF Core detecta as mudanças automaticamente ao SaveChanges.
        //    Não é necessário chamar Update() explicitamente.
        titular.Atualizar(command.Nome, command.Nacionalidade, command.AssociacaoId, status, caeIpi);
        await _titularRepository.SaveChangesAsync(cancellationToken);

        // 7. Reload com Associação
        titular = await _titularRepository.GetByIdAsync(titular.Id, cancellationToken) ?? titular;

        return ListarTitularesQueryHandler.MapToResponse(titular);
    }
}
