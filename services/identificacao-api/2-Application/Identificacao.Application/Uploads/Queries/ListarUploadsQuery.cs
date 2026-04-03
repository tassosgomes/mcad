using System;
using Identificacao.Application.Common;
using Identificacao.Application.Uploads.Responses;

namespace Identificacao.Application.Uploads.Queries;

public record ListarUploadsQuery(
    Guid CaptacaoId,
    int Page,
    int Size
) : IQuery<UploadListResponse>;
