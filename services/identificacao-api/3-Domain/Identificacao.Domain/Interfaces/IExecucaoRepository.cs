using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IExecucaoRepository
{
    Task<Execucao?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct);
    Task<(IEnumerable<Execucao> Items, int Total)> ListarAsync(
        Guid captacaoId, string? status, string sort, int page, int size, CancellationToken ct);
    Task<int> ContarPorCaptacaoAsync(Guid captacaoId, CancellationToken ct);
    Task<int> ContarIdentificadasAsync(Guid captacaoId, CancellationToken ct);
    Task<int> ContarPendentesAsync(Guid captacaoId, CancellationToken ct);
    Task<(IEnumerable<Execucao> Items, int Total)> ListarPendentesAsync(Guid? captacaoId, Guid? rubricaId, DateOnly? periodoInicio, DateOnly? periodoFim, string? q, string sort, int page, int size, CancellationToken ct);
    Task<(IEnumerable<Identificacao.Domain.Models.ImpactoPendenteModel> Items, int Total)> ListarImpactoPendentesAsync(Guid? captacaoId, Guid? rubricaId, DateOnly? periodoInicio, DateOnly? periodoFim, string? q, string sort, int page, int size, CancellationToken ct);
    Task<IEnumerable<Execucao>> ListarPendentesPorIdentificadorAsync(string identificador, string tipo, CancellationToken ct);
    Task<IEnumerable<Execucao>> ListarPendentesComObraIdAsync(CancellationToken ct);
    Task AddAsync(Execucao execucao, CancellationToken ct);
    Task RemoveAsync(Execucao execucao, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
