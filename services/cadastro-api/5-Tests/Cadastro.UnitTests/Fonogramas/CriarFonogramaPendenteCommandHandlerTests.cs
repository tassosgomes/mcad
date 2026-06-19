using AwesomeAssertions;
using Cadastro.Application.Audit;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Fonogramas;

public class CriarFonogramaPendenteCommandHandlerTests
{
    private readonly Mock<IFonogramaRepository> _fonogramaRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly CriarFonogramaPendenteCommandHandler _handler;

    public CriarFonogramaPendenteCommandHandlerTests()
    {
        _fonogramaRepoMock = new Mock<IFonogramaRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _handler = new CriarFonogramaPendenteCommandHandler(
            _fonogramaRepoMock.Object,
            _obraRepoMock.Object,
            Mock.Of<IFonogramaAuditPublisher>());
    }

    [Fact]
    public void Validator_ComIsrcVazio_DeveRetornarErro()
    {
        var validator = new CriarFonogramaPendenteCommandValidator();
        var command = new CriarFonogramaPendenteCommand(string.Empty, Guid.NewGuid());

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.ErrorMessage == "ISRC é obrigatório.");
    }

    [Fact]
    public void Validator_ComIsrcInvalido_DeveRetornarErro()
    {
        var validator = new CriarFonogramaPendenteCommandValidator();
        var command = new CriarFonogramaPendenteCommand("123456789012", Guid.NewGuid());

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.ErrorMessage.StartsWith("ISRC deve seguir formato"));
    }

    [Fact]
    public void Validator_ComObraIdVazio_DeveRetornarErro()
    {
        var validator = new CriarFonogramaPendenteCommandValidator();
        var command = new CriarFonogramaPendenteCommand("BRXYZ2300001", Guid.Empty);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.ErrorMessage == "ID da obra é obrigatório.");
    }

    [Fact]
    public async Task HandleAsync_ComDadosValidos_DeveRetornarCriadoPendenteValidacao()
    {
        var command = new CriarFonogramaPendenteCommand("BRXYZ2300001", Guid.NewGuid());
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        _obraRepoMock.Setup(repo => repo.GetByIdAsync(command.ObraId, default)).ReturnsAsync(obra);
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(false);

        var result = await _handler.HandleAsync(command, default);

        result.Should().NotBeNull();
        result.Isrc.Should().Be("BRXYZ2300001");
        result.PaisOrigem.Should().Be("BR");
        result.Status.Should().Be("PENDENTE_VALIDACAO");
        result.Obra.Id.Should().Be(obra.Id);

        _fonogramaRepoMock.Verify(repo => repo.AddAsync(It.IsAny<Fonograma>(), default), Times.Once);
        _fonogramaRepoMock.Verify(repo => repo.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComIsrcEstrangeiro_DeveDerivarPaisOrigemDoIsrc()
    {
        var command = new CriarFonogramaPendenteCommand("USXYZ2300001", Guid.NewGuid());
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        _obraRepoMock.Setup(repo => repo.GetByIdAsync(command.ObraId, default)).ReturnsAsync(obra);
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("USXYZ2300001", default)).ReturnsAsync(false);

        var result = await _handler.HandleAsync(command, default);

        result.PaisOrigem.Should().Be("US");
    }

    [Fact]
    public async Task HandleAsync_ComIsrcDuplicado_DeveLancarConflictException()
    {
        var command = new CriarFonogramaPendenteCommand("BRXYZ2300001", Guid.NewGuid());
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(true);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<ConflictException>().WithMessage("*Já existe um fonograma com o ISRC*");
        _obraRepoMock.Verify(repo => repo.GetByIdAsync(It.IsAny<Guid>(), default), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComObraInexistente_DeveLancarNotFoundException()
    {
        var command = new CriarFonogramaPendenteCommand("BRXYZ2300001", Guid.NewGuid());
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(false);
        _obraRepoMock.Setup(repo => repo.GetByIdAsync(command.ObraId, default)).ReturnsAsync((ObraMusical?)null);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<NotFoundException>();
    }
}
