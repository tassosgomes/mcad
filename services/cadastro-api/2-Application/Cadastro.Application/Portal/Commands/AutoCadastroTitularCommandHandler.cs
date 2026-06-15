using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Services;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de auto-cadastro do titular no Portal (RF-01, RF-02, RF-03, RF-04).
/// <para>
/// Pipeline:
/// 1. Normaliza documento via Cpf.Create/Cnpj.Create (DomainException se inválido).
/// 2. Busca titular por documento. RF-02: titular inexistente → AutenticacaoTitularException (mensagem genérica, RF-06).
/// 3. Valida CAE/IPI informado corresponde ao cadastrado (RF-02). Divergente → AutenticacaoTitularException.
/// 4. Verifica se já existe credencial para o titular (RF-03). Existente → ConflictException.
/// 5. Gera hash BCrypt work factor 12 (RF-04).
/// 6. Persiste credencial e retorna { titular: { id, nome } } (sem token).
/// </para>
/// </summary>
public class AutoCadastroTitularCommandHandler : ICommandHandler<AutoCadastroTitularCommand, AutoCadastroResponse>
{
    private const int BcryptWorkFactor = 12;

    private readonly ITitularRepository _titularRepository;
    private readonly ICredencialTitularRepository _credencialRepository;
    private readonly ILogger<AutoCadastroTitularCommandHandler> _logger;

    public AutoCadastroTitularCommandHandler(
        ITitularRepository titularRepository,
        ICredencialTitularRepository credencialRepository,
        ILogger<AutoCadastroTitularCommandHandler> logger)
    {
        _titularRepository = titularRepository;
        _credencialRepository = credencialRepository;
        _logger = logger;
    }

    public async Task<AutoCadastroResponse> HandleAsync(
        AutoCadastroTitularCommand command, CancellationToken cancellationToken)
    {
        // 1. Normalizar documento via VO — lança DomainException se inválido (422).
        var documento = NormalizarDocumento(command.Documento);

        // 2. Buscar titular por documento. RF-02: titular inexistente → 401 genérico (RF-06).
        var titular = await _titularRepository.GetByDocumentoAsync(documento, cancellationToken);
        if (titular is null)
        {
            // Não revela que o documento está incorreto — RF-06.
            _logger.LogInformation("Auto-cadastro recusado: titular não encontrado para o documento informado");
            throw new AutenticacaoTitularException();
        }

        // 3. Validar CAE/IPI corresponde ao cadastrado (RF-02).
        var caeInformado = command.CaeIpi?.Trim() ?? string.Empty;
        var caeCadastrado = titular.CaeIpi?.Valor ?? string.Empty;
        if (!string.Equals(caeInformado, caeCadastrado, StringComparison.OrdinalIgnoreCase))
        {
            // Mesma mensagem genérica — não revela qual campo está incorreto (RF-06).
            using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = titular.Id });
            _logger.LogInformation("Auto-cadastro recusado: CAE/IPI divergente");
            throw new AutenticacaoTitularException();
        }

        // 4. Verificar se já existe credencial (RF-03).
        var existente = await _credencialRepository.ByTitularIdAsync(titular.Id, cancellationToken);
        if (existente is not null)
        {
            // Este é o único caminho que revela informação — o titular sabe que já tem conta.
            throw new ConflictException("Já existe conta para este CPF/CNPJ");
        }

        // 5. Hash BCrypt work factor 12 (RF-04). Sal é embutido no hash.
        var senhaHash = BCryptNet.HashPassword(command.Senha, workFactor: BcryptWorkFactor);

        // 6. Criar credencial e persistir.
        var credencial = CredencialTitular.Criar(titular.Id, senhaHash);
        await _credencialRepository.AddAsync(credencial, cancellationToken);
        await _credencialRepository.SaveChangesAsync(cancellationToken);

        using var successScope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = titular.Id });
        _logger.LogInformation("Auto-cadastro concluído para o titular");

        return new AutoCadastroResponse(new TitularResumo(titular.Id, titular.Nome));
    }

    /// <summary>
    /// Normaliza o documento via VOs Cpf/Cnpj. Retorna o valor limpo (dígitos ou alfanumérico).
    /// Lança <see cref="Cadastro.Domain.Exceptions.DomainException"/> se o documento for inválido.
    /// </summary>
    private static string NormalizarDocumento(string documento)
    {
        // CPF tem 11 dígitos; CNPJ tem 14 caracteres alfanuméricos.
        // Tentamos CPF primeiro quando o input limpo tem 11 caracteres numéricos.
        var limpo = (documento ?? string.Empty).Trim();
        var onlyDigits = new string(limpo.Where(char.IsDigit).ToArray());

        if (onlyDigits.Length == 11 && limpo.Length <= 14)
        {
            return Cpf.Create(limpo).Valor;
        }

        return Cnpj.Create(limpo).Valor;
    }
}
