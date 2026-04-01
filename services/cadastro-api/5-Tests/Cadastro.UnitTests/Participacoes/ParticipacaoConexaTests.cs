using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace Cadastro.UnitTests.Participacoes;

public class ParticipacaoConexaTests
{
    [Fact]
    public void Criar_RetornaEntidade_ComPercentualNull()
    {
        var fonoId = Guid.NewGuid();
        var titularId = Guid.NewGuid();

        var p = ParticipacaoConexa.Criar(fonoId, titularId, CategoriaConexo.Interprete);

        p.Id.Should().NotBeEmpty();
        p.FonogramaId.Should().Be(fonoId);
        p.TitularId.Should().Be(titularId);
        p.Categoria.Should().Be(CategoriaConexo.Interprete);
        p.Percentual.Should().BeNull(); // aguardando cálculo
    }

    [Fact]
    public void DefinirPercentual_ValorValido_SalvaArredondado4Casas()
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.Interprete);

        p.DefinirPercentual(43.7m);

        p.Percentual.Should().Be(43.7000m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(100.0001)]
    [InlineData(101)]
    public void DefinirPercentual_ValorInvalido_ThrowsDomainException(decimal invalido)
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.Interprete);

        var act = () => p.DefinirPercentual(invalido);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AjustarPercentualManual_Interprete_AtualizeComSucesso()
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.Interprete);
        p.DefinirPercentual(21.85m);

        p.AjustarPercentualManual(30.0m);

        p.Percentual.Should().Be(30.0m);
    }

    [Fact]
    public void AjustarPercentualManual_Produtor_AtualizeComSucesso()
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.ProdutorFonografico);
        p.DefinirPercentual(50.0m);

        p.AjustarPercentualManual(60.0m);

        p.Percentual.Should().Be(60.0m);
    }

    [Fact]
    public void AjustarPercentualManual_Musico_ThrowsDomainException()
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.MusicoExecutante);

        var act = () => p.AjustarPercentualManual(10.0m);

        act.Should().Throw<DomainException>()
            .WithMessage("*Músico Executante*");
    }

    [Theory]
    [InlineData(CategoriaConexo.Interprete, true)]
    [InlineData(CategoriaConexo.ProdutorFonografico, true)]
    [InlineData(CategoriaConexo.MusicoExecutante, false)]
    public void Editavel_DeveRefletirCategoria(CategoriaConexo categoria, bool esperado)
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), categoria);

        p.Editavel.Should().Be(esperado);
    }
}
