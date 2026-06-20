using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Identificacao.Application.Uploads.Services;

public class CsvParser
{
    private static readonly HashSet<string> TiposValidos = new() { "TA", "TE", "PE", "BK" };
    private static readonly string[] ColunasObrigatorias = { "isrc", "iswc", "inicio", "fim", "tipo_utilizacao", "titulo_programa" };

    public CsvParseResult Parse(StreamReader reader, bool exigeClassificacao)
    {
        var linhas = new List<CsvLinha>();
        var erros = new List<ErroUploadDto>();
        
        var headerLine = reader.ReadLine();
        if (headerLine == null)
            return CsvParseResult.ErroGlobal("Arquivo vazio ou sem cabeçalho válido");

        var header = headerLine.Split(';');
        if (!ValidarHeader(header))
            return CsvParseResult.ErroGlobal("Colunas obrigatórias ausentes");

        int numLinha = 1;

        while (!reader.EndOfStream)
        {
            numLinha++;
            var line = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(line)) continue;

            var campos = line.Split(';');
            var linhaErros = ValidarLinha(numLinha, campos, exigeClassificacao);
            if (linhaErros.Any())
            {
                erros.AddRange(linhaErros);
                continue;
            }

            linhas.Add(MapearLinha(numLinha, campos));
        }

        var duplicataErros = DetectarDuplicatas(linhas);
        erros.AddRange(duplicataErros);

        var linhasValidas = linhas.Where(l => !duplicataErros.Any(e => e.Linha == l.NumeroLinha)).ToList();
        var agrupadas = Agrupar(linhasValidas);

        return new CsvParseResult(agrupadas, erros, numLinha - 1);
    }

    private bool ValidarHeader(string[] header)
    {
        var headerSet = new HashSet<string>(header.Select(h => h.Trim().ToLowerInvariant()));
        foreach (var col in ColunasObrigatorias)
        {
            if (!headerSet.Contains(col)) return false;
        }
        return true;
    }

    private List<ErroUploadDto> ValidarLinha(int numLinha, string[] campos, bool exigeClassificacao)
    {
        var erros = new List<ErroUploadDto>();

        // Ensure we have enough columns, otherwise pad
        string isrc = campos.Length > 0 ? campos[0].Trim() : "";
        string iswc = campos.Length > 1 ? campos[1].Trim() : "";
        string inicioStr = campos.Length > 2 ? campos[2].Trim() : "";
        string fimStr = campos.Length > 3 ? campos[3].Trim() : "";
        string tipoUtil = campos.Length > 4 ? campos[4].Trim().ToUpperInvariant() : "";
        string titulo = campos.Length > 5 ? campos[5].Trim() : "";

        if (string.IsNullOrEmpty(isrc) && string.IsNullOrEmpty(iswc))
            erros.Add(new ErroUploadDto(numLinha, "isrc/iswc", "Ao menos um identificador (ISRC ou ISWC) é obrigatório"));

        TimeOnly inicio = default;
        bool inicioValido = TimeOnly.TryParseExact(inicioStr, "HH:mm:ss", out inicio);
        if (!inicioValido)
            erros.Add(new ErroUploadDto(numLinha, "inicio", "Formato de hora inválido. Esperado HH:mm:ss"));

        TimeOnly fim = default;
        bool fimValido = TimeOnly.TryParseExact(fimStr, "HH:mm:ss", out fim);
        if (!fimValido)
            erros.Add(new ErroUploadDto(numLinha, "fim", "Formato de hora inválido. Esperado HH:mm:ss"));

        if (inicioValido && fimValido && fim <= inicio)
            erros.Add(new ErroUploadDto(numLinha, "fim", "Horário de fim deve ser posterior ao início"));

        if (exigeClassificacao)
        {
            if (string.IsNullOrEmpty(tipoUtil))
                erros.Add(new ErroUploadDto(numLinha, "tipo_utilizacao", "Obrigatório para rubricas audiovisuais (TA, TE, PE, BK)"));
            else if (!TiposValidos.Contains(tipoUtil))
                erros.Add(new ErroUploadDto(numLinha, "tipo_utilizacao", $"Valor inválido '{tipoUtil}'. Valores aceitos: TA, TE, PE, BK"));

            if (string.IsNullOrEmpty(titulo))
                erros.Add(new ErroUploadDto(numLinha, "titulo_programa", "Obrigatório para rubricas audiovisuais"));
        }

        return erros;
    }

    private CsvLinha MapearLinha(int numLinha, string[] campos)
    {
        return new CsvLinha(
            numLinha,
            campos.Length > 0 && !string.IsNullOrEmpty(campos[0].Trim()) ? campos[0].Trim() : null,
            campos.Length > 1 && !string.IsNullOrEmpty(campos[1].Trim()) ? campos[1].Trim() : null,
            TimeOnly.ParseExact(campos.Length > 2 ? campos[2].Trim() : "00:00:00", "HH:mm:ss"),
            TimeOnly.ParseExact(campos.Length > 3 ? campos[3].Trim() : "00:00:00", "HH:mm:ss"),
            campos.Length > 4 && !string.IsNullOrEmpty(campos[4].Trim()) ? campos[4].Trim().ToUpperInvariant() : null,
            campos.Length > 5 && !string.IsNullOrEmpty(campos[5].Trim()) ? campos[5].Trim() : null
        );
    }

    private List<ErroUploadDto> DetectarDuplicatas(List<CsvLinha> linhas)
    {
        var erros = new List<ErroUploadDto>();
        var vistos = new Dictionary<string, (int Linha, TimeOnly Inicio, TimeOnly Fim, string? TipoUtil)>();

        foreach (var linha in linhas)
        {
            var chave = linha.Isrc ?? linha.Iswc ?? "";
            if (string.IsNullOrEmpty(chave)) continue;

            if (vistos.TryGetValue(chave, out var anterior))
            {
                if (anterior.Inicio != linha.Inicio || anterior.Fim != linha.Fim)
                {
                    erros.Add(new(linha.NumeroLinha, "isrc", $"ISRC {chave} já registrado com horário diferente (linha {anterior.Linha})"));
                }
                else if (anterior.TipoUtil != linha.TipoUtilizacao)
                {
                    erros.Add(new(linha.NumeroLinha, "tipo_utilizacao", $"ISRC {chave} na linha {linha.NumeroLinha} tem tipo de utilização divergente da linha {anterior.Linha}"));
                    if (!erros.Any(e => e.Linha == anterior.Linha && e.Coluna == "tipo_utilizacao"))
                    {
                        erros.Add(new(anterior.Linha, "tipo_utilizacao", $"ISRC {chave} na linha {anterior.Linha} tem tipo de utilização divergente da linha {linha.NumeroLinha}"));
                    }
                }
            }
            else
            {
                vistos[chave] = (linha.NumeroLinha, linha.Inicio, linha.Fim, linha.TipoUtilizacao);
            }
        }

        return erros;
    }

    private List<CsvLinhaAgrupada> Agrupar(List<CsvLinha> linhas)
    {
        return linhas
            .GroupBy(l => new { l.Isrc, l.Iswc, l.Inicio, l.Fim, l.TipoUtilizacao, l.TituloPrograma })
            .Select(g => new CsvLinhaAgrupada(
                Isrc: g.Key.Isrc,
                Iswc: g.Key.Iswc,
                Inicio: g.Key.Inicio,
                Fim: g.Key.Fim,
                TipoUtilizacao: g.Key.TipoUtilizacao,
                TituloPrograma: g.Key.TituloPrograma,
                Quantidade: g.Count()
            )).ToList();
    }
}
