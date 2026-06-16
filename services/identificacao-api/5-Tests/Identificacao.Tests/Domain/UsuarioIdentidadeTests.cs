using FluentAssertions;
using Identificacao.Domain.Identidade;

namespace Identificacao.Tests.Domain;

public class UsuarioIdentidadeTests
{
    [Fact]
    public void NomeExibicao_DisplayNamePreenchido_RetornaDisplayName()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = "João Silva",
            Username = "joao",
            Email = "joao@email.com"
        };

        usuario.NomeExibicao.Should().Be("João Silva");
    }

    [Fact]
    public void NomeExibicao_SemDisplayName_RetornaUsername()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = null,
            Username = "joao",
            Email = "joao@email.com"
        };

        usuario.NomeExibicao.Should().Be("joao");
    }

    [Fact]
    public void NomeExibicao_SemDisplayNameNemUsername_RetornaEmail()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = null,
            Username = null,
            Email = "joao@email.com"
        };

        usuario.NomeExibicao.Should().Be("joao@email.com");
    }

    [Fact]
    public void NomeExibicao_SemNada_RetornaLogtoUserId()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = null,
            Username = null,
            Email = null
        };

        usuario.NomeExibicao.Should().Be("sub-01");
    }

    [Fact]
    public void NomeExibicao_DisplayNameVazio_RetornaUsername()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = "",
            Username = "joao",
            Email = null
        };

        usuario.NomeExibicao.Should().Be("");
    }

    [Fact]
    public void NomeExibicao_UsernameVazio_RetornaUsernameVazio()
    {
        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = null,
            Username = "",
            Email = null
        };

        usuario.NomeExibicao.Should().Be("");
    }
}
