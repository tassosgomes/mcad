using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Ocorrencias.Queries;

/// <summary>
/// Obtém uma ocorrência pelo Id para visualização pelo analista (RF-33).
/// </summary>
public record GetOcorrenciaByIdQuery(Guid Id) : IQuery<OcorrenciaResponse>;
