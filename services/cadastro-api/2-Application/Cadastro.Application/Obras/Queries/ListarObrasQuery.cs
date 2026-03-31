using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Obras.Queries;

public record ListarObrasQuery(
    int Page = 1,
    int Size = 20,
    string? Sort = "titulo",
    string? Titulo = null,
    string? Iswc = null,
    TipoObra? Tipo = null,
    StatusObra? Status = null,
    string? Genero = null
) : IQuery<ObraListResponse>;
