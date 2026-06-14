using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Queries;

public record ObterDownloadUrlQuery(TipoEntidadeAnexo EntidadeTipo, Guid EntidadeId, Guid AnexoId)
    : IQuery<DownloadUrlResponse>;
