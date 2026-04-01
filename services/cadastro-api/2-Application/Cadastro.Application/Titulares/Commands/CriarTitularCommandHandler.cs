using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Queries;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Handler para criação de titular (PF ou PJ).
/// Pipeline: Validator → VO validation → unicidade → FK associação → persist → outbox event.
/// </summary>
public class CriarTitularCommandHandler : ICommandHandler<CriarTitularCommand, TitularResponse>
{
    private readonly ITitularRepository _titularRepository;
    private readonly IAssociacaoRepository _associacaoRepository;
    private readonly IValidator<CriarTitularCommand> _validator;
    private readonly IOutboxEventWriter _outbox;

    public CriarTitularCommandHandler(
        ITitularRepository titularRepository,
        IAssociacaoRepository associacaoRepository,
        IValidator<CriarTitularCommand> validator,
        IOutboxEventWriter outbox)
    {
        _titularRepository = titularRepository;
        _associacaoRepository = associacaoRepository;
        _validator = validator;
        _outbox = outbox;
    }

    public async Task<TitularResponse> HandleAsync(
        CriarTitularCommand command, CancellationToken cancellationToken)
    {
        // 1. Validação de campo (FluentValidation)
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        // 2. Verificar que a associação existe (FK válida)
        var associacao = await _associacaoRepository.GetByIdAsync(command.AssociacaoId, cancellationToken)
            ?? throw new NotFoundException("Associação", command.AssociacaoId);

        // 3. Criar o titular com validação dos Value Objects
        Titular titular;
        var caeIpi = !string.IsNullOrWhiteSpace(command.CaeIpi)
            ? CaeIpi.Create(command.CaeIpi)
            : null;

        try
        {
            if (command.Tipo.ToUpperInvariant() == "PF")
            {
                var cpf = Cpf.Create(command.Documento); // Lança DomainException se inválido
                titular = Titular.CriarPessoaFisica(command.Nome, cpf, command.Nacionalidade, command.AssociacaoId, caeIpi);
            }
            else
            {
                var cnpj = Cnpj.Create(command.Documento); // Lança DomainException se inválido
                titular = Titular.CriarPessoaJuridica(command.Nome, cnpj, command.Nacionalidade, command.AssociacaoId, caeIpi);
            }
        }
        catch (DomainException)
        {
            throw; // Relança — mapeado para 422 no GlobalExceptionHandler
        }

        // 4. Verificar unicidade do documento (RF-05)
        var existeDocumento = await _titularRepository.ExisteDocumentoAsync(titular.Documento, cancellationToken);
        if (existeDocumento)
            throw new ConflictException(
                $"Já existe um titular cadastrado com este {command.Tipo}: {titular.DocumentoFormatado}");

        // 5. Persistir
        titular = await _titularRepository.AddAsync(titular, cancellationToken);

        // 6. Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.titular.criado", titular.Id.ToString(), new
        {
            titularId = titular.Id,
            nome = titular.Nome,
            tipo = command.Tipo.ToUpperInvariant(),
            documento = titular.DocumentoFormatado,
        });

        await _titularRepository.SaveChangesAsync(cancellationToken);

        // Reload com Associação para o response
        titular = await _titularRepository.GetByIdAsync(titular.Id, cancellationToken) ?? titular;

        return ListarTitularesQueryHandler.MapToResponse(titular);
    }
}
