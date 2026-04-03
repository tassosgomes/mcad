using System;

namespace Identificacao.Application.Uploads.Responses;

public record ErroUploadResponse(
    int Linha, string Coluna, string Mensagem
);
