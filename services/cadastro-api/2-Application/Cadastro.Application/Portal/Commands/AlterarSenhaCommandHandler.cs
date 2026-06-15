using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Handler de alteração de senha do titular autenticado (RF-07).
/// <para>
/// Fluxo:
/// 1. Carrega credencial por titularId (do ICurrentTitular — token JWT).
/// 2. Se credencial não existe → AutenticacaoTitularException (401 genérico).
/// 3. Verifica senha atual com BCryptNet.Verify. Divergente → AutenticacaoTitularException.
/// 4. Re-hasheia nova senha (BCrypt work factor 12) e persiste.
/// </para>
/// </summary>
public class AlterarSenhaCommandHandler : ICommandHandler<AlterarSenhaCommand, bool>
{
    private const int BcryptWorkFactor = 12;

    private readonly ICredencialTitularRepository _credencialRepository;
    private readonly ILogger<AlterarSenhaCommandHandler> _logger;

    public AlterarSenhaCommandHandler(
        ICredencialTitularRepository credencialRepository,
        ILogger<AlterarSenhaCommandHandler> logger)
    {
        _credencialRepository = credencialRepository;
        _logger = logger;
    }

    public async Task<bool> HandleAsync(
        AlterarSenhaCommand command, CancellationToken cancellationToken)
    {
        // 1. Carregar credencial.
        var credencial = await _credencialRepository.ByTitularIdAsync(command.TitularId, cancellationToken);
        if (credencial is null)
        {
            _logger.LogInformation("Alteração de senha recusada: credencial não encontrada para titular {TitularId}", command.TitularId);
            throw new AutenticacaoTitularException();
        }

        using var scope = _logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = command.TitularId });

        // 2. Verificar senha atual.
        if (!BCryptNet.Verify(command.SenhaAtual, credencial.SenhaHash))
        {
            _logger.LogInformation("Alteração de senha recusada: senha atual incorreta");
            throw new AutenticacaoTitularException();
        }

        // 3. Re-hash e persistir. Hash é imutável na entidade — usamos Update para anexar
        // como Modified e o repositório aplica a alteração via change tracker.
        var novoHash = BCryptNet.HashPassword(command.NovaSenha, workFactor: BcryptWorkFactor);
        _credencialRepository.Update(credencial);
        credencial.AtualizarSenhaHash(novoHash);
        await _credencialRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Senha alterada com sucesso");
        return true;
    }
}
