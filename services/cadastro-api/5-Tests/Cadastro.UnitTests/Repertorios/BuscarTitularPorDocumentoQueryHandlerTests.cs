using AwesomeAssertions;
using Cadastro.Application.Repertorios.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Repertorios;

public class BuscarTitularPorDocumentoQueryHandlerTests
{
    private readonly Mock<ITitularRepository> _mockRepo;
    private readonly BuscarTitularPorDocumentoQueryHandler _handler;

    public BuscarTitularPorDocumentoQueryHandlerTests()
    {
        _mockRepo = new Mock<ITitularRepository>();
        _handler = new BuscarTitularPorDocumentoQueryHandler(_mockRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_TitularEncontradoPorCpf_DeveRetornarResumoMascarado()
    {
        var associacao = new Associacao(Guid.NewGuid(), "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        var titular = Titular.CriarPessoaFisica("João Silva", Cpf.Create("12345678909"), "BR", associacao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titular, associacao);

        var query = new BuscarTitularPorDocumentoQuery("123.456.789-09");

        _mockRepo.Setup(r => r.GetByDocumentoAsync("12345678909", It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(titular.Id);
        result!.Nome.Should().Be("João Silva");
        result!.Tipo.Should().Be("PF");
        result!.DocumentoFormatado.Should().Be("123.456.789-09");
        result!.Associacao.Should().Be("ABRAMUS");
    }

    [Fact]
    public async Task HandleAsync_TitularEncontradoPorCnpj_DeveRetornarResumoMascarado()
    {
        var associacao = new Associacao(Guid.NewGuid(), "UBC", "União Brasileira", "50.997.063/0001-32");
        var titular = Titular.CriarPessoaJuridica("Editora XYZ", Cnpj.Create("50997063000132"), "BR", associacao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titular, associacao);

        var query = new BuscarTitularPorDocumentoQuery("50.997.063/0001-32");

        _mockRepo.Setup(r => r.GetByDocumentoAsync("50997063000132", It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(titular.Id);
        result!.Tipo.Should().Be("PJ");
        result!.DocumentoFormatado.Should().Be("50.997.063/0001-32");
        result!.Associacao.Should().Be("UBC");
    }

    [Fact]
    public async Task HandleAsync_TitularNaoEncontrado_DeveRetornarNull()
    {
        var query = new BuscarTitularPorDocumentoQuery("00000000000");

        _mockRepo.Setup(r => r.GetByDocumentoAsync("00000000000", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task HandleAsync_DocumentoVazio_DeveRetornarNullSemConsultarRepositorio()
    {
        var query = new BuscarTitularPorDocumentoQuery("");

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().BeNull();
        _mockRepo.Verify(r => r.GetByDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DocumentoApenasFormatacao_DeveRetornarNullSemConsultarRepositorio()
    {
        var query = new BuscarTitularPorDocumentoQuery(".-/");

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task HandleAsync_DocumentoNormalizado_DeveRemoverFormatacao()
    {
        var associacao = new Associacao(Guid.NewGuid(), "ABRAMUS", "Associação", "50.997.063/0001-32");
        var titular = Titular.CriarPessoaFisica("Maria", Cpf.Create("98765432100"), "BR", associacao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titular, associacao);

        var query = new BuscarTitularPorDocumentoQuery("987.654.321-00");

        _mockRepo.Setup(r => r.GetByDocumentoAsync("98765432100", It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().NotBeNull();
        _mockRepo.Verify(r => r.GetByDocumentoAsync("98765432100", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_TitularSemAssociacao_DeveRetornarNomeVazio()
    {
        var titular = Titular.CriarPessoaFisica("Sem Associação", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var query = new BuscarTitularPorDocumentoQuery("123.456.789-09");

        _mockRepo.Setup(r => r.GetByDocumentoAsync("12345678909", It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Associacao.Should().Be(string.Empty);
    }
}
