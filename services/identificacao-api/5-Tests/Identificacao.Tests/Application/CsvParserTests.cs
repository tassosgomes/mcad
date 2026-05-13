using System;
using System.IO;
using System.Linq;
using System.Text;
using FluentAssertions;
using Identificacao.Application.Uploads.Services;
using Xunit;

namespace Identificacao.Tests.Application;

public class CsvParserTests
{
    private CsvParser CreateParser() => new();

    private StreamReader CreateReader(string csvContent)
    {
        var ms = new MemoryStream(Encoding.UTF8.GetBytes(csvContent));
        return new StreamReader(ms, Encoding.UTF8);
    }

    [Fact]
    public void Parse_CsvValido3Linhas_3Execucoes()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:30:00;14:33:45;TA;Novela das 9\n" +
                  "BRUM71500002;;14:35:00;14:38:20;BK;Novela das 9\n" +
                  ";T-345.246.800-1;15:00:00;15:04:10;PE;Show da Tarde";
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.IsErroGlobal.Should().BeFalse();
        result.TotalLinhas.Should().Be(3);
        result.Erros.Should().BeEmpty();
        result.LinhasAgrupadas.Should().HaveCount(3);
    }

    [Fact]
    public void Parse_HeaderInvalido_ErroGlobal()
    {
        var parser = CreateParser();
        var csv = "isrc;inicio;fim"; // Faltam colunas
        using var reader = CreateReader(csv);
        
        var result = parser.Parse(reader, true);

        result.IsErroGlobal.Should().BeTrue();
        result.MensagemErroGlobal.Should().Contain("Colunas obrigatórias ausentes");
    }

    [Fact]
    public void Parse_LinhaSemIsrcNemIswc_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  ";;14:30:00;14:33:45;TA;Novela";
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().ContainSingle(e => e.Coluna.Contains("isrc/iswc"));
        result.LinhasAgrupadas.Should().BeEmpty();
    }

    [Fact]
    public void Parse_InicioMaiorQueFim_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:35:00;14:33:45;TA;Novela";
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().ContainSingle(e => e.Coluna == "fim" && e.Mensagem.Contains("posterior ao início"));
    }

    [Fact]
    public void Parse_AudiovisualSemTipoUtilizacao_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:30:00;14:33:45;;Novela";
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true); // true = exigeClassificacao

        result.Erros.Should().ContainSingle(e => e.Coluna == "tipo_utilizacao");
    }

    [Fact]
    public void Parse_TipoUtilizacaoDesconhecido_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:30:00;14:33:45;XX;Novela";
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().ContainSingle(e => e.Coluna == "tipo_utilizacao" && e.Mensagem.Contains("XX"));
    }

    [Fact]
    public void Parse_MesmoIsrcHorariosDivergentes_ErroSegundaLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BR888;;14:00:00;14:03:00;TA;Prog\n" +
                  "BR888;;15:00:00;15:03:00;TA;Prog"; // Linha 3 divergente
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().ContainSingle(e => e.Linha == 3 && e.Coluna == "isrc");
        result.LinhasAgrupadas.Should().ContainSingle(l => l.Quantidade == 1);
    }

    [Fact]
    public void Parse_MesmoIsrcMesmoHorarioTipoDivergente_ErroAmbasLinhas()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BR999;;14:00:00;14:03:00;TA;Prog\n" + // Linha 2
                  "BR999;;14:00:00;14:03:00;BK;Prog"; // Linha 3: divergente
                  
        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().HaveCount(2);
        result.Erros.Should().Contain(e => e.Linha == 2 && e.Coluna == "tipo_utilizacao");
        result.Erros.Should().Contain(e => e.Linha == 3 && e.Coluna == "tipo_utilizacao");
        result.LinhasAgrupadas.Should().BeEmpty();
    }

    // ───────────── Cobertura faltante ─────────────

    [Fact]
    public void Parse_ArquivoVazio_ErroGlobal()
    {
        var parser = CreateParser();
        using var reader = CreateReader("");

        var result = parser.Parse(reader, true);

        result.IsErroGlobal.Should().BeTrue();
        result.MensagemErroGlobal.Should().Contain("Arquivo vazio");
    }

    [Fact]
    public void Parse_InicioFormatoInvalido_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:30;14:33:45;TA;Novela"; // inicio sem segundos

        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().Contain(e => e.Coluna == "inicio" && e.Mensagem.Contains("HH:mm:ss"));
        result.LinhasAgrupadas.Should().BeEmpty();
    }

    [Fact]
    public void Parse_FimFormatoInvalido_ErroPorLinha()
    {
        var parser = CreateParser();
        var csv = "isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa\n" +
                  "BRUM71500001;;14:30:00;xx:xx:xx;TA;Novela"; // fim inválido

        using var reader = CreateReader(csv);
        var result = parser.Parse(reader, true);

        result.Erros.Should().Contain(e => e.Coluna == "fim" && e.Mensagem.Contains("HH:mm:ss"));
        result.LinhasAgrupadas.Should().BeEmpty();
    }
}
