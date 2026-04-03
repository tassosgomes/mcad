using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

public record FonogramaFiltro(
    int Page = 1, int Size = 20, string? Sort = "isrc",
    string? Isrc = null, Guid? ObraId = null, string? ObraTitulo = null,
    StatusFonograma? Status = null, string? Pais = null);

public interface IFonogramaRepository
{
    Task<(IEnumerable<Fonograma> Items, int Total)> ListarAsync(FonogramaFiltro filtro, CancellationToken ct);
    Task<IEnumerable<Fonograma>> GetByObraIdAsync(Guid obraId, CancellationToken ct);
    Task<Fonograma?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteIsrcAsync(string isrc, CancellationToken ct);
    Task<bool> ExisteIsrcAsync(string isrc, Guid excludeId, CancellationToken ct);
    Task<Fonograma> AddAsync(Fonograma fonograma, CancellationToken ct);
    void Update(Fonograma fonograma);
    void Delete(Fonograma fonograma);
    Task<IEnumerable<Fonograma>> BuscarAsync(string termo, int limit, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
