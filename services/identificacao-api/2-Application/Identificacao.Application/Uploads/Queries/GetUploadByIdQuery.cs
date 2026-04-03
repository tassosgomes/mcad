using System;
using Identificacao.Application.Common;
using Identificacao.Application.Uploads.Responses;

namespace Identificacao.Application.Uploads.Queries;

public record GetUploadByIdQuery(
    Guid CaptacaoId,
    Guid Id
) : IQuery<UploadResponse>;
