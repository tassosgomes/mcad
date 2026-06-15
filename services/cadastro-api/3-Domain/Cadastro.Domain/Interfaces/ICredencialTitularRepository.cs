using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato do repositório de <see cref="CredencialTitular"/>.
/// Busca por titular (1:1) ou por documento (CPF/CNPJ) do titular vinculado.
/// </summary>
public interface ICredencialTitularRepository
{
    Task<CredencialTitular?> ByTitularIdAsync(Guid titularId, CancellationToken cancellationToken);

    Task<CredencialTitular?> ByDocumentoAsync(string documento, CancellationToken cancellationToken);

    Task AddAsync(CredencialTitular credencial, CancellationToken cancellationToken);

    /// <summary>
    /// Marca a credencial como modificada no contexto EF para que mudanças
    /// em <see cref="CredencialTitular.TentativasFalhas"/> / <see cref="CredencialTitular.BloqueadoAte"/>
    /// sejam detectadas pelo change tracker ao <see cref="SaveChangesAsync"/>.
    /// Espelha <c>ITitularRepository.Update</c>.
    /// </summary>
    void Update(CredencialTitular credencial);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
