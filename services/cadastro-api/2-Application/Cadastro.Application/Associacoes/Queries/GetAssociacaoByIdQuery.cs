using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Associacoes.Queries;

/// <summary>
/// Query para buscar uma associação por ID.
/// Corresponde ao endpoint GET /api/v1/associacoes/{id} (RF-09).
/// </summary>
public record GetAssociacaoByIdQuery(Guid Id) : IQuery<AssociacaoResponse>;
