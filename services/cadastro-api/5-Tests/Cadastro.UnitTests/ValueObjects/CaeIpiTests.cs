using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class CaeIpiTests
{
    [Fact]
    public void Create_ComValorValido_DeveRetornarCaeIpi()
    {
        // Act
        var result = CaeIpi.Create("1234567890");

        // Assert
        result.Should().NotBeNull();
        result.Valor.Should().Be("1234567890");
    }

    [Fact]
    public void Create_ComValorMaiorQue20Caracteres_DeveLancarDomainException()
    {
        // Act
        var action = () => CaeIpi.Create("123456789012345678901"); // 21 chars

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CAE/IPI deve ter entre 1 e 20 caracteres");
    }
    
}
