using System;

namespace Identificacao.Application.Uploads.Responses;

public record UploadResponse(
    Guid Id, Guid CaptacaoId, string NomeArquivo,
    string Status, int? TotalLinhas, int? ExecucoesCriadas,
    int? TotalErros, string? MensagemErro,
    DateTime CriadoEm, DateTime? ProcessadoEm
);
