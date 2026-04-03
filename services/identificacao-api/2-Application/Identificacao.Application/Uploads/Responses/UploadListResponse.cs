using System.Collections.Generic;
using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Uploads.Responses;

public record UploadListResponse(
    IEnumerable<UploadResponse> Data,
    PaginationResponse Pagination
);
