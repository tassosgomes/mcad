using System.Collections.Generic;

namespace Identificacao.Application.Uploads.Services;

public record CsvParseResult(
    List<CsvLinhaAgrupada> LinhasAgrupadas,
    List<ErroUploadDto> Erros,
    int TotalLinhas,
    bool IsErroGlobal = false,
    string? MensagemErroGlobal = null)
{
    public static CsvParseResult ErroGlobal(string mensagem) =>
        new(new(), new(), 0, true, mensagem);
}
