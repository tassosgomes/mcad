using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class ObraMusicalTests
{
    [Fact]
    public void Criar_DeveRetornarObraComStatusPendente()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical, "Sub", "Rock");
        
        obra.Titulo.Should().Be("Teste");
        obra.Tipo.Should().Be(TipoObra.Musical);
        obra.Subtitulo.Should().Be("Sub");
        obra.Genero.Should().Be("Rock");
        obra.Status.Should().Be(StatusObra.Pendente);
        obra.DominioPublico.Should().BeFalse();
    }

    [Fact]
    public void Atualizar_ComStatusDepurada_DeveLancarDomainException()
    {
        var obraOriginal = ObraMusical.Criar("Teste", TipoObra.Musical);
        obraOriginal.AtribuirIswc("T-123.456.789-0");
        var novaObra = ObraMusical.Criar("Novo Titulo", TipoObra.Musical);
        obraOriginal.Depurar(novaObra.Id);
        
        var act = () => obraOriginal.Atualizar("Teste2", null, TipoObra.Versao, null);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Atualizar_DeveAtualizarPropriedades()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.Atualizar("Novo", "Sub Novo", TipoObra.PotPourri, "Jazz");
        
        obra.Titulo.Should().Be("Novo");
        obra.Subtitulo.Should().Be("Sub Novo");
        obra.Tipo.Should().Be(TipoObra.PotPourri);
        obra.Genero.Should().Be("Jazz");
    }

    [Fact]
    public void AtribuirIswc_DeveAtribuirEAtualizarStatusParaLiberado()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-000.000.000-0");
        
        obra.Iswc.Should().Be("T-000.000.000-0");
        obra.Status.Should().Be(StatusObra.Liberado);
    }

    [Fact]
    public void AtribuirIswc_ObraNaoPendente_DeveLancarException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-000.000.000-0");
        
        var act = () => obra.AtribuirIswc("T-111.111.111-1");
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Depurar_NaoLiberado_DeveLancarException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        var novaObra = ObraMusical.Criar("Novo", TipoObra.Musical);
        
        var act = () => obra.Depurar(novaObra.Id);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void MarcarDominioPublico_Pendente_DeveMudarStatus()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.MarcarDominioPublico(true);
        obra.Status.Should().Be(StatusObra.DominioPublico);
        obra.DominioPublico.Should().BeTrue();
    }

    [Fact]
    public void MarcarDominioPublico_Desmarcar_DeveRestaurarStatus()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123.456.789-0");
        
        obra.MarcarDominioPublico(true);
        obra.Status.Should().Be(StatusObra.DominioPublico);
        
        obra.MarcarDominioPublico(false);
        obra.Status.Should().Be(StatusObra.Liberado);
    }

    [Fact]
    public void RequerDepuracao_DeveRetornarVerdadeiroSeLiberadoETituloDiferente()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123.456.789-0");
        
        obra.RequerDepuracao("Novo Titulo").Should().BeTrue();
    }

    [Fact]
    public void RequerDepuracao_DeveRetornarFalsoSePendente()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.RequerDepuracao("Novo Titulo").Should().BeFalse();
    }
}
