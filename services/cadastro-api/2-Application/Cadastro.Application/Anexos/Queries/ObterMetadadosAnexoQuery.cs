using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Queries;

public record ObterMetadadosAnexoQuery(TipoEntidadeAnexo EntidadeTipo, Guid EntidadeId, Guid AnexoId)
    : IQuery<AnexoResponse>;
