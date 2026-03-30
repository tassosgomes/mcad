using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Responses;

namespace Cadastro.Application.Titulares.Queries;

/// <summary>
/// Query para buscar um único titular pelo seu ID.
/// </summary>
public record GetTitularByIdQuery(Guid Id) : IQuery<TitularResponse>;
