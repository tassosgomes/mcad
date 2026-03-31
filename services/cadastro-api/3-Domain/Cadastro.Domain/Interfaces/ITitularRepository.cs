using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato do repositório de Titulares.
/// Inclui paginação com filtros server-side, verificação de unicidade de documento
/// e proteção contra exclusão de titulares com vínculos (RF-23).
/// </summary>
public interface ITitularRepository
{
    /// <summary>
    /// Lista titulares com paginação, filtros e ordenação server-side.
    /// Retorna os items da página e o total de registros (para paginação).
    /// </summary>
    Task<(IEnumerable<Titular> Items, int Total)> ListarAsync(
        TitularFiltro filtro, CancellationToken cancellationToken);

    /// <summary>Busca titular por ID incluindo a Associação (navigação).</summary>
    Task<Titular?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Verifica se já existe um titular com o documento informado.
    /// Usado na criação para garantir unicidade (RF-05).
    /// </summary>
    Task<bool> ExisteDocumentoAsync(string documento, CancellationToken cancellationToken);

    /// <summary>
    /// Verifica unicidade excluindo um ID específico.
    /// Usado na atualização para permitir manter o mesmo documento.
    /// </summary>
    Task<bool> ExisteDocumentoAsync(string documento, Guid excludeId, CancellationToken cancellationToken);

    /// <summary>Adiciona um novo titular ao contexto.</summary>
    Task<Titular> AddAsync(Titular titular, CancellationToken cancellationToken);

    /// <summary>Marca a entidade como modificada no contexto EF.</summary>
    void Update(Titular titular);

    /// <summary>Remove a entidade do contexto EF.</summary>
    void Delete(Titular titular);

    /// <summary>
    /// Verifica se o titular possui vínculos com obras ou fonogramas (RF-23).
    /// Inicialmente retorna false — tabelas de vínculo serão criadas em F04/F06.
    /// </summary>
    Task<bool> PossuiVinculosAsync(Guid titularId, CancellationToken cancellationToken);

    /// <summary>Persiste todas as mudanças pendentes no contexto.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);

    /// <summary>Busca titulares por nome ou documento para autocomplete.</summary>
    Task<IEnumerable<Titular>> BuscarParaAutocompleteAsync(string q, int limit, CancellationToken cancellationToken);
}
