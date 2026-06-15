using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Metrics;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Services;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de login do titular no Portal (RF-05, RF-06, RF-07 brute-force mitigation).
/// <para>
/// Fluxo (Tech Spec — *Fluxo de Login*):
/// 1. Normaliza documento via Cpf/Cnpj VO.
/// 2. credencial = repo.ByDocumentoAsync(documento). Se null → AutenticacaoTitularException (401 genérico).
/// 3. Se credencial.EstaBloqueado → AutenticacaoTitularException (401 genérico, RF-06).
/// 4. Se !BCryptNet.Verify(senha, hash): credencial.IncrementarFalha() (lockout exponencial); salvar; → 401 genérico.
/// 5. credencial.ResetarFalhas(); salvar; emitir token JWT; retornar { token, expiraEm, titular }.
/// </para>
/// <para>
/// LGPD: loga apenas <c>TitularId</c> — nunca documento nem senha.
/// </para>
/// </summary>
public class LoginTitularCommandHandler : ICommandHandler<LoginTitularCommand, LoginResponse>
{
    private static readonly TimeSpan TokenTtl = TimeSpan.FromMinutes(60);

    private readonly ICredencialTitularRepository _credencialRepository;
    private readonly ITitularRepository _titularRepository;
    private readonly ITitularTokenService _tokenService;
    private readonly ILogger<LoginTitularCommandHandler> _logger;

    public LoginTitularCommandHandler(
        ICredencialTitularRepository credencialRepository,
        ITitularRepository titularRepository,
        ITitularTokenService tokenService,
        ILogger<LoginTitularCommandHandler> logger)
    {
        _credencialRepository = credencialRepository;
        _titularRepository = titularRepository;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<LoginResponse> HandleAsync(
        LoginTitularCommand command, CancellationToken cancellationToken)
    {
        // 1. Normalizar documento (CPF/CNPJ). DomainException se inválido —
        // tratado como 401 genérico pelo caller para não revelar formato válido.
        string documento;
        try
        {
            documento = NormalizarDocumento(command.Documento);
        }
        catch (Cadastro.Domain.Exceptions.DomainException)
        {
            _logger.LogInformation("Login recusado: documento inválido");
            throw new AutenticacaoTitularException();
        }

        // 2. Buscar credencial por documento (JOIN com titulares).
        var credencial = await _credencialRepository.ByDocumentoAsync(documento, cancellationToken);
        if (credencial is null)
        {
            // Mensagem genérica — RF-06.
            _logger.LogInformation("Login recusado: credencial não encontrada para o documento");
            PortalMetrics.IncrementLoginAttempt("invalid");
            throw new AutenticacaoTitularException();
        }

        // Log scope contém apenas TitularId — LGPD.
        using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = credencial.TitularId });

        // 3. Lockout ativo → 401 genérico (RF-06: titular não sabe que está bloqueado).
        if (credencial.EstaBloqueado)
        {
            _logger.LogInformation("Login recusado: credencial bloqueada");
            PortalMetrics.IncrementLoginAttempt("locked");
            throw new AutenticacaoTitularException();
        }

        // 4. Verificar senha com BCrypt. Falha → incrementar + 401 genérico.
        if (!BCryptNet.Verify(command.Senha, credencial.SenhaHash))
        {
            _credencialRepository.Update(credencial);
            credencial.IncrementarFalha();
            await _credencialRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Login recusado: senha incorreta (tentativa {Tentativas})", credencial.TentativasFalhas);
            PortalMetrics.IncrementLoginAttempt("invalid");
            throw new AutenticacaoTitularException();
        }

        // 5. Sucesso: resetar falhas e persistir.
        _credencialRepository.Update(credencial);
        credencial.ResetarFalhas();
        await _credencialRepository.SaveChangesAsync(cancellationToken);

        // 6. Carregar titular para gerar token e retornar resumo.
        var titular = await _titularRepository.GetByIdAsync(credencial.TitularId, cancellationToken);
        if (titular is null)
        {
            // Caso patológico: credencial existe mas titular foi removido.
            _logger.LogError("Titular {TitularId} não encontrado para credencial existente", credencial.TitularId);
            throw new AutenticacaoTitularException();
        }

        var token = _tokenService.Gerar(titular);
        var expiraEm = DateTime.UtcNow.Add(TokenTtl);

        _logger.LogInformation("Login bem-sucedido");
        PortalMetrics.IncrementLoginAttempt("success");

        return new LoginResponse(
            token,
            expiraEm,
            new TitularResumo(titular.Id, titular.Nome));
    }

    /// <summary>
    /// Normaliza documento via VOs. Lança <c>DomainException</c> se inválido.
    /// Heurística simples: 11 dígitos → CPF; caso contrário → CNPJ.
    /// </summary>
    private static string NormalizarDocumento(string documento)
    {
        var limpo = (documento ?? string.Empty).Trim();
        var onlyDigits = new string(limpo.Where(char.IsDigit).ToArray());

        if (onlyDigits.Length == 11 && limpo.Length <= 14)
        {
            return Cpf.Create(limpo).Valor;
        }

        return Cnpj.Create(limpo).Valor;
    }
}
