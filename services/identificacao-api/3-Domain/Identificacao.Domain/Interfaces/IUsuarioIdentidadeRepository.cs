using Identificacao.Domain.Identidade;

namespace Identificacao.Domain.Interfaces;

public interface IUsuarioIdentidadeRepository
{
    Task<IReadOnlyList<UsuarioIdentidade>> ListarAtivosAsync(CancellationToken ct);
    Task<IReadOnlyList<UsuarioIdentidade>> ListarTodosAsync(CancellationToken ct);
    Task<UsuarioIdentidade?> BuscarPorSubjectAsync(string logtoUserId, CancellationToken ct);
}
