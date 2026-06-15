using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class CepTests
{
    [Fact]
    public void Create_ComCepSemMascara_DeveRetornarCep()
    {
        // Act
        var result = Cep.Create("01001000");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("01001000");
    }

    [Fact]
    public void Create_ComCepComMascara_DeveNormalizarParaDigitos()
    {
        // Act
        var result = Cep.Create("01001-000");

        // Assert
        result.Valor.Should().Be("01001000");
    }

    [Fact]
    public void Formatado_DeveRetornarCepComMascara()
    {
        // Arrange
        var cep = Cep.Create("01001000");

        // Act
        var result = cep.Formatado;

        // Assert
        result.Should().Be("01001-000");
    }

    [Theory]
    [InlineData("0100100")]   // 7 dígitos
    [InlineData("010010000")] // 9 dígitos
    [InlineData("01001-00")]  // máscara curta
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComTamanhoIncorreto_DeveLancarDomainException(string cepInvalido)
    {
        // Act
        var action = () => Cep.Create(cepInvalido);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CEP inválido");
    }
}
