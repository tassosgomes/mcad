using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class TelefoneTests
{
    [Fact]
    public void Create_ComCelularValido_DeveRetornarTelefone()
    {
        // Act
        var result = Telefone.Create("11999990000");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("11999990000");
    }

    [Fact]
    public void Create_ComFixoValido_DeveRetornarTelefone()
    {
        // Act
        var result = Telefone.Create("1133330000");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("1133330000");
    }

    [Fact]
    public void Create_ComMascara_DeveRemoverNaoDigitos()
    {
        // Act
        var result = Telefone.Create("(11) 99999-0000");

        // Assert
        result.Valor.Should().Be("11999990000");
    }

    [Fact]
    public void Formatado_ComCelular11Digitos_DeveRetornarMascaraCompleta()
    {
        // Arrange
        var telefone = Telefone.Create("11999990000");

        // Act
        var result = telefone.Formatado;

        // Assert
        result.Should().Be("(11) 99999-0000");
    }

    [Fact]
    public void Formatado_ComFixo10Digitos_DeveRetornarMascaraSimplificada()
    {
        // Arrange
        var telefone = Telefone.Create("1133330000");

        // Act
        var result = telefone.Formatado;

        // Assert
        result.Should().Be("(11) 3333-0000");
    }

    [Theory]
    [InlineData("1099990000")]  // DDD 10 (inválido)
    [InlineData("00999990000")] // DDD 00 (inválido)
    [InlineData("1199999")]     // 7 dígitos
    [InlineData("119999999")]   // 9 dígitos
    [InlineData("119999999999")] // 12 dígitos
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComValorInvalido_DeveLancarDomainException(string telefoneInvalido)
    {
        // Act
        var action = () => Telefone.Create(telefoneInvalido);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("Telefone inválido");
    }
}
