using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Responses;

namespace Cadastro.Application.Obras.Queries;

public record ListarObrasQuery(
    int Page = 1,
    int Size = 20,
    string? Sort = "titulo",
    long? Codigo = null,
    string? Titulo = null,
    string? Iswc = null,
    string? Tipo = null,
    string? Status = null,
    string? Genero = null
) : IQuery<ObraListResponse>;
