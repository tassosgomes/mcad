namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response de uma ocorrência aberta pelo titular (RF-27 a RF-32).
/// <para>
/// Inclui <see cref="Status"/> atual e <see cref="Resolucao"/> quando houver (RF-30).
/// </para>
/// </summary>
public record OcorrenciaResponse(
    Guid Id,
    string Tipo,
    Guid? ObraId,
    Guid? FonogramaId,
    string Descricao,
    string Status,
    string? Resolucao,
    DateTime AbertaEm,
    DateTime? ResolvidaEm);
