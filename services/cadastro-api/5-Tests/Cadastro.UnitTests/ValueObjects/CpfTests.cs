using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class CpfTests
{
    [Fact]
    public void Create_ComCpfValido_DeveRetornarCpf()
    {
        // Act
        var result = Cpf.Create("12345678909");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("12345678909");
    }

    [Fact]
    public void Create_ComCpfComMascara_DeveLimparApenasNumeros()
    {
        // Act
        var result = Cpf.Create("123.456.789-09");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("12345678909");
    }

    [Fact]
    public void Formatado_DeveRetornarCpfComMascara()
    {
        // Arrange
        var cpf = Cpf.Create("12345678909");

        // Act
        var result = cpf.Formatado;

        // Assert
        result.Should().Be("123.456.789-09");
    }

    [Theory]
    [InlineData("11111111111")]
    [InlineData("00000000000")]
    public void Create_ComSequenciasDeNumerosIguais_DeveLancarDomainException(string cpfInvalido)
    {
        // Act
        var action = () => Cpf.Create(cpfInvalido);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CPF inválido");
    }

    [Theory]
    [InlineData("1234567890")] // 10 dígitos
    [InlineData("123456789012")] // 12 dígitos
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComTamanhoIncorreto_DeveLancarDomainException(string cpfInvalido)
    {
        // Act
        var action = () => Cpf.Create(cpfInvalido);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CPF inválido");
    }

    [Fact]
    public void Create_ComDigitoVerificadorIncorreto_DeveLancarDomainException()
    {
        // Act
        var action = () => Cpf.Create("12345678900");

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CPF inválido");
    }
}
