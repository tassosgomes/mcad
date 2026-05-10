using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Commands;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Titularidades;

public class AdicionarTitularidadeHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly Mock<ITitularRepository> _titularRepoMock;
    private readonly AdicionarTitularidadeCommandHandler _handler;

    public AdicionarTitularidadeHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _titularRepoMock = new Mock<ITitularRepository>();
        _handler = new AdicionarTitularidadeCommandHandler(
            _titularidadeRepoMock.Object,
            _obraRepoMock.Object,
            _titularRepoMock.Object,
            Mock.Of<ITitularidadeAuditPublisher>());
    }

    [Fact]
    public async Task HandleAsync_ProcessoValido_DeveRetornarResponse()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        var titular = Titular.CriarPessoaFisica("Nome PF", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var command = new AdicionarTitularidadeCommand(obra.Id, titular.Id, "Autor", 10.0m);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularRepoMock.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titular);
        _titularidadeRepoMock.Setup(r => r.ExisteDuplicataAsync(obra.Id, titular.Id, CategoriaAutoral.Autor, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var titularidade = TitularidadeAutoral.Criar(obra.Id, titular.Id, CategoriaAutoral.Autor, 10.0m);
        typeof(TitularidadeAutoral).GetProperty("Titular")!.SetValue(titularidade, titular);

        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TitularidadeAutoral>
        {
            titularidade
        });

        // Act
        var act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        
        // Assert
        var result = await act.Should().NotThrowAsync();
        result.Subject.Should().BeOfType<TitularidadesResponse>();
        _titularidadeRepoMock.Verify(r => r.AddAsync(It.IsAny<TitularidadeAutoral>(), It.IsAny<CancellationToken>()), Times.Once);
        _titularidadeRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ObraNaoEncontrada_DeveLancarNotFoundException()
    {
        var command = new AdicionarTitularidadeCommand(Guid.NewGuid(), Guid.NewGuid(), "Autor", 10.0m);
        _obraRepoMock.Setup(r => r.GetByIdAsync(command.ObraId, It.IsAny<CancellationToken>())).ReturnsAsync((ObraMusical)null!);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task HandleAsync_ObraDepurada_DeveLancarDomainException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        // Force status to Depurada
        typeof(ObraMusical).GetProperty("Status")!.SetValue(obra, StatusObra.Depurada);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AdicionarTitularidadeCommand(obra.Id, Guid.NewGuid(), "Autor", 10.0m);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>();
    }

    [Fact]
    public async Task HandleAsync_ObraLiberada_DeveLancarDepuracaoNecessariaException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-1234"); // Liberado

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AdicionarTitularidadeCommand(obra.Id, Guid.NewGuid(), "Autor", 10.0m);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

    [Fact]
    public async Task HandleAsync_EditorENaoPJ_DeveLancarDomainException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        var titular = Titular.CriarPessoaFisica("Nome", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var command = new AdicionarTitularidadeCommand(obra.Id, titular.Id, "Editor", 10.0m);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularRepoMock.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titular);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("A categoria Editor exige titular Pessoa Jurídica");
    }

    [Fact]
    public async Task HandleAsync_Duplicata_DeveLancarConflictException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        var titular = Titular.CriarPessoaFisica("Nome", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var command = new AdicionarTitularidadeCommand(obra.Id, titular.Id, "Autor", 10.0m);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularRepoMock.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titular);
        _titularidadeRepoMock.Setup(r => r.ExisteDuplicataAsync(obra.Id, titular.Id, CategoriaAutoral.Autor, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<ConflictException>();
    }
}
