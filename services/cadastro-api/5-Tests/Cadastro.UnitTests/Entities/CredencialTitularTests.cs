using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Exceptions;

namespace Cadastro.UnitTests.Entities;

public class CredencialTitularTests
{
    private const string SenhaHashValida = "$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN";

    [Fact]
    public void Criar_ComTitularIdESenhaHashValidos_DeveGerarIdEZerarFalhas()
    {
        var titularId = Guid.NewGuid();

        var credencial = CredencialTitular.Criar(titularId, SenhaHashValida);

        credencial.Id.Should().NotBeEmpty();
        credencial.TitularId.Should().Be(titularId);
        credencial.SenhaHash.Should().Be(SenhaHashValida);
        credencial.TentativasFalhas.Should().Be(0);
        credencial.BloqueadoAte.Should().BeNull();
        credencial.EstaBloqueado.Should().BeFalse();
    }

    [Fact]
    public void Criar_ComTitularIdVazio_DeveLancarDomainException()
    {
        var action = () => CredencialTitular.Criar(Guid.Empty, SenhaHashValida);

        action.Should().Throw<DomainException>().WithMessage("TitularId é obrigatório");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Criar_ComSenhaHashVazia_DeveLancarDomainException(string senhaHash)
    {
        var action = () => CredencialTitular.Criar(Guid.NewGuid(), senhaHash);

        action.Should().Throw<DomainException>().WithMessage("SenhaHash é obrigatório");
    }

    [Fact]
    public void IncrementarFalha_AntesDaQuintaFalha_NaoDeveBloquear()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);

        for (var i = 0; i < 4; i++)
            credencial.IncrementarFalha();

        credencial.TentativasFalhas.Should().Be(4);
        credencial.BloqueadoAte.Should().BeNull();
        credencial.EstaBloqueado.Should().BeFalse();
    }

    [Fact]
    public void IncrementarFalha_NaQuintaFalha_DeveBloquearPorUmMinuto()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);

        for (var i = 0; i < 5; i++)
            credencial.IncrementarFalha();

        credencial.TentativasFalhas.Should().Be(5);
        credencial.BloqueadoAte.Should().NotBeNull();
        credencial.EstaBloqueado.Should().BeTrue();
        var duracao = credencial.BloqueadoAte!.Value - DateTime.UtcNow;
        duracao.Should().BeCloseTo(TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void IncrementarFalha_NaDecimaFalha_DeveBloquearPorCincoMinutos()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);

        for (var i = 0; i < 10; i++)
            credencial.IncrementarFalha();

        credencial.TentativasFalhas.Should().Be(10);
        credencial.EstaBloqueado.Should().BeTrue();
        var duracao = credencial.BloqueadoAte!.Value - DateTime.UtcNow;
        duracao.Should().BeCloseTo(TimeSpan.FromMinutes(5), TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void IncrementarFalha_NaDecimaQuintaFalha_DeveBloquearPorQuinzeMinutos()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);

        for (var i = 0; i < 15; i++)
            credencial.IncrementarFalha();

        credencial.TentativasFalhas.Should().Be(15);
        credencial.EstaBloqueado.Should().BeTrue();
        var duracao = credencial.BloqueadoAte!.Value - DateTime.UtcNow;
        duracao.Should().BeCloseTo(TimeSpan.FromMinutes(15), TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void ResetarFalhas_AposBloqueio_DeveZerarFalhasELimparBloqueio()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);
        for (var i = 0; i < 5; i++)
            credencial.IncrementarFalha();
        credencial.EstaBloqueado.Should().BeTrue();

        credencial.ResetarFalhas();

        credencial.TentativasFalhas.Should().Be(0);
        credencial.BloqueadoAte.Should().BeNull();
        credencial.EstaBloqueado.Should().BeFalse();
    }

    [Fact]
    public void EstaBloqueado_ComBloqueadoAteNoPassado_DeveRetornarFalse()
    {
        var credencial = CredencialTitular.Criar(Guid.NewGuid(), SenhaHashValida);
        for (var i = 0; i < 5; i++)
            credencial.IncrementarFalha();

        var propBloqueadoAte = typeof(CredencialTitular).GetProperty("BloqueadoAte");
        propBloqueadoAte!.SetValue(credencial, DateTime.UtcNow.AddSeconds(-1));

        credencial.EstaBloqueado.Should().BeFalse();
    }
}
