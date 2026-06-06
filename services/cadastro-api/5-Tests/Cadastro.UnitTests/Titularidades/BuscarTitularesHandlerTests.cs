using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Titularidades.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;
using Cadastro.UnitTests;

namespace Cadastro.UnitTests.Titularidades;

public class BuscarTitularesHandlerTests
{
    private readonly Mock<ITitularRepository> _titularRepoMock;
    private readonly BuscarTitularesQueryHandler _handler;

    public BuscarTitularesHandlerTests()
    {
        _titularRepoMock = new Mock<ITitularRepository>();
        _handler = new BuscarTitularesQueryHandler(
            _titularRepoMock.Object,
            PermissionsTestHelper.With(true));
    }

    [Fact]
    public async Task HandleAsync_TemResultado_DeveRetornarLista()
    {
        var titular = Titular.CriarPessoaFisica("Nome PF1", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var query = new BuscarTitularesQuery("Nome", 10);
        
        _titularRepoMock.Setup(r => r.BuscarParaAutocompleteAsync("Nome", 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Titular> { titular });

        var result = await _handler.HandleAsync(query, CancellationToken.None);
        result.Should().HaveCount(1);
        result.First().Nome.Should().Be("Nome PF1");
        result.First().DocumentoFormatado.Should().NotBeNullOrWhiteSpace();
    }
}
