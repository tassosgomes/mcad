using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Services;
using FluentAssertions;
using Xunit;

namespace Cadastro.UnitTests.Status;

public class ValidadorLiberacaoObraTests
{
    private static ObraMusical CriarObra(string titulo = "Titulo Valido", TipoObra tipo = TipoObra.Musical)
        => ObraMusical.Criar(titulo, tipo);

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_TodosPreRequisitosAtendidos_DeveMarcarTodosComoAtendidos()
    {
        var obra = CriarObra("Titulo Valido", TipoObra.Musical);

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: true);

        resultado.Should().HaveCount(4);
        resultado.Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // Título
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_TituloVazio_DeveMarcarTituloComoNaoAtendido()
    {
        // ObraMusical.Criar accepts any non-null string; we use reflection to
        // put an empty titulo after construction to bypass ArgumentNullException.
        var obra = CriarObra("Placeholder");
        typeof(ObraMusical).GetProperty("Titulo")!.SetValue(obra, string.Empty);

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: true);

        resultado.Single(p => p.Item == "Título").Atendido.Should().BeFalse();
        resultado.Where(p => p.Item != "Título").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    [Fact]
    public void Validar_TituloWhitespace_DeveMarcarTituloComoNaoAtendido()
    {
        var obra = CriarObra("Placeholder");
        typeof(ObraMusical).GetProperty("Titulo")!.SetValue(obra, "   ");

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: true);

        resultado.Single(p => p.Item == "Título").Atendido.Should().BeFalse();
        resultado.Where(p => p.Item != "Título").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // Tipo
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_TipoInvalido_DeveMarcarTipoComoNaoAtendido()
    {
        // Cast to an undefined enum value — Enum.IsDefined returns false for this.
        var obra = CriarObra();
        typeof(ObraMusical).GetProperty("Tipo")!.SetValue(obra, (TipoObra)999);

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: true);

        resultado.Single(p => p.Item == "Tipo").Atendido.Should().BeFalse();
        resultado.Where(p => p.Item != "Tipo").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // ISWC
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_SemIswc_DeveMarcarIswcComoNaoAtendidoComMotivo()
    {
        var obra = CriarObra();

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: false);

        var iswcPreRequisito = resultado.Single(p => p.Item == "ISWC");
        iswcPreRequisito.Atendido.Should().BeFalse();
        iswcPreRequisito.Detalhe.Should().Be("ISWC não obtido");
        resultado.Where(p => p.Item != "ISWC").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // Titularidades
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_TitularidadesSomaIncompleta_DeveMarcarTitularidadesComoNaoAtendidoComMotivo()
    {
        var obra = CriarObra();

        var resultado = ValidadorLiberacaoObra.Validar(obra, 99.0000m, temIswc: true);

        var titularidadesPreRequisito = resultado.Single(p => p.Item == "Titularidades");
        titularidadesPreRequisito.Atendido.Should().BeFalse();
        titularidadesPreRequisito.Detalhe.Should().Contain("Soma (99.0000%)");
        titularidadesPreRequisito.Detalhe.Should().Contain("diferente de 100%");
        resultado.Where(p => p.Item != "Titularidades").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    [Fact]
    public void Validar_TitularidadesSomaExcedente_DeveMarcarTitularidadesComoNaoAtendido()
    {
        var obra = CriarObra();

        var resultado = ValidadorLiberacaoObra.Validar(obra, 100.0001m, temIswc: true);

        resultado.Single(p => p.Item == "Titularidades").Atendido.Should().BeFalse();
        resultado.Where(p => p.Item != "Titularidades").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    [Fact]
    public void Validar_TitularidadesSomaZero_DeveMarcarTitularidadesComoNaoAtendido()
    {
        var obra = CriarObra();

        var resultado = ValidadorLiberacaoObra.Validar(obra, 0m, temIswc: true);

        var titularidadesPreRequisito = resultado.Single(p => p.Item == "Titularidades");
        titularidadesPreRequisito.Atendido.Should().BeFalse();
        titularidadesPreRequisito.Detalhe.Should().NotBeNullOrWhiteSpace();
        resultado.Where(p => p.Item != "Titularidades").Should().AllSatisfy(p => p.Atendido.Should().BeTrue());
    }

    // -----------------------------------------------------------------------
    // Todos falham
    // -----------------------------------------------------------------------

    [Fact]
    public void Validar_TodosPreRequisitosFalham_DeveListarTodasAsPendencias()
    {
        // titulo vazio via reflexão + tipo inválido via reflexão + sem ISWC + soma zero
        var obra = CriarObra("Placeholder");
        typeof(ObraMusical).GetProperty("Titulo")!.SetValue(obra, string.Empty);
        typeof(ObraMusical).GetProperty("Tipo")!.SetValue(obra, (TipoObra)999);

        var resultado = ValidadorLiberacaoObra.Validar(obra, 0m, temIswc: false);

        resultado.Should().HaveCount(4);
        resultado.Should().AllSatisfy(p => p.Atendido.Should().BeFalse());
    }
}
