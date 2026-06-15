using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class UfTests
{
    [Fact]
    public void Create_ComUfMaiusculaValida_DeveRetornarUf()
    {
        // Act
        var result = Uf.Create("SP");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("SP");
    }

    [Theory]
    [InlineData("sp", "SP")]
    [InlineData("Rj", "RJ")]
    [InlineData("mg", "MG")]
    public void Create_ComUfMinuscula_DeveNormalizarParaMaiuscula(string entrada, string esperado)
    {
        // Act
        var result = Uf.Create(entrada);

        // Assert
        result.Valor.Should().Be(esperado);
    }

    [Fact]
    public void Create_ComEspacosNasBordas_DeveRemoverEspacos()
    {
        // Act
        var result = Uf.Create("  sp  ");

        // Assert
        result.Valor.Should().Be("SP");
    }

    [Theory]
    [InlineData("XX")]
    [InlineData("SP1")]
    [InlineData("A")]
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComUfInvalida_DeveLancarDomainException(string ufInvalida)
    {
        // Act
        var action = () => Uf.Create(ufInvalida);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("UF inválida");
    }
}
