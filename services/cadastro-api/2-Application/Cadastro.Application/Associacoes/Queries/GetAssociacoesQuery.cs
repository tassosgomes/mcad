using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Associacoes.Queries;

/// <summary>
/// Query para listar todas as associações de gestão coletiva.
/// Corresponde ao endpoint GET /api/v1/associacoes (RF-08).
/// </summary>
public record GetAssociacoesQuery() : IQuery<IEnumerable<AssociacaoResponse>>;
