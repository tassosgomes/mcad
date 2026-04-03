using System.Collections.Generic;
using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Uploads.Responses;

public record ErroUploadListResponse(
    IEnumerable<ErroUploadResponse> Data,
    PaginationResponse Pagination
);
