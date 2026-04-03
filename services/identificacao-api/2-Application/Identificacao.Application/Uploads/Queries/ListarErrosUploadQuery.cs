using System;
using Identificacao.Application.Common;
using Identificacao.Application.Uploads.Responses;

namespace Identificacao.Application.Uploads.Queries;

public record ListarErrosUploadQuery(
    Guid UploadId,
    int Page,
    int Size
) : IQuery<ErroUploadListResponse>;
