namespace Cadastro.API.Authorization;

/// <summary>
/// Abstrai o titular autenticado no contexto da requisição corrente (scheme "Titular").
/// Espelha <c>ICurrentUserPermissions</c> — lê a claim <c>sub</c> do <c>HttpContext</c>.
/// </summary>
public interface ICurrentTitular
{
    /// <summary>Id do titular autenticado. <c>Guid.Empty</c> se não autenticado.</summary>
    Guid TitularId { get; }

    /// <summary>True se a requisição está autenticada sob o scheme "Titular".</summary>
    bool IsAutenticado { get; }
}
