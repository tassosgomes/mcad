using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

public interface IObraRepository
{
    Task<(IEnumerable<ObraMusical> Items, int Total)> ListarAsync(ObraFiltro filtro, CancellationToken ct);
    Task<ObraMusical?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteIswcAsync(string iswc, CancellationToken ct);
    Task<bool> ExisteIswcAsync(string iswc, Guid excludeId, CancellationToken ct);
    Task<ObraMusical> AddAsync(ObraMusical obra, CancellationToken ct);
    void Update(ObraMusical obra);
    void Delete(ObraMusical obra);
    Task<IEnumerable<ObraMusical>> BuscarAsync(string termo, int limit, CancellationToken ct);
    Task<bool> PossuiVinculosAsync(Guid obraId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

public record ObraFiltro(
    int Page = 1, int Size = 20, string? Sort = "titulo",
    long? Codigo = null,
    string? Titulo = null, string? Iswc = null,
    TipoObra? Tipo = null, StatusObra? Status = null, string? Genero = null);
