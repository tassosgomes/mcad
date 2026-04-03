namespace Identificacao.Application.Uploads.Services;

public record ErroUploadDto(
    int Linha,
    string Coluna,
    string Mensagem
);
