using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class EmailTests
{
    [Theory]
    [InlineData("a@x.com")]
    [InlineData("user.name+tag@domain.co.uk")]
    [InlineData("titular@ecad.org")]
    public void Create_ComEmailValido_DeveRetornarEmail(string email)
    {
        // Act
        var result = Email.Create(email);

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be(email);
    }

    [Fact]
    public void Create_ComEmailComMaiusculas_DeveNormalizarParaMinusculas()
    {
        // Act
        var result = Email.Create("Usuario@EXEMPLO.COM");

        // Assert
        result.Valor.Should().Be("usuario@exemplo.com");
    }

    [Fact]
    public void Create_ComEspacosNasBordas_DeveRemoverEspacos()
    {
        // Act
        var result = Email.Create("  a@x.com  ");

        // Assert
        result.Valor.Should().Be("a@x.com");
    }

    [Theory]
    [InlineData("invalido")]
    [InlineData("a@")]
    [InlineData("@x.com")]
    [InlineData("a@x")]
    [InlineData("a x@x.com")]
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComFormatoInvalido_DeveLancarDomainException(string emailInvalido)
    {
        // Act
        var action = () => Email.Create(emailInvalido);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("E-mail inválido");
    }
}
