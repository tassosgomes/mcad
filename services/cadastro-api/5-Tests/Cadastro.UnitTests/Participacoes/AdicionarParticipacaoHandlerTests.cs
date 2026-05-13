using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Commands;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Participacoes;

public class AdicionarParticipacaoHandlerTests
{
    private readonly Mock<IParticipacaoRepository> _participacaoRepo = new();
    private readonly Mock<IFonogramaRepository> _fonogramaRepo = new();
    private readonly Mock<ITitularRepository> _titularRepo = new();
    private readonly AdicionarParticipacaoCommandHandler _handler;

    public AdicionarParticipacaoHandlerTests()
    {
        _handler = new AdicionarParticipacaoCommandHandler(
            _participacaoRepo.Object,
            _fonogramaRepo.Object,
            _titularRepo.Object,
            Mock.Of<IParticipacaoAuditPublisher>());
    }

    private Fonograma CriarFonograma(StatusFonograma status = StatusFonograma.PendenteValidacao)
    {
        var fono = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR");
        if (status == StatusFonograma.Depurado)
            typeof(Fonograma).GetProperty("Status")!.SetValue(fono, StatusFonograma.Depurado);
        if (status == StatusFonograma.Liberado)
            typeof(Fonograma).GetProperty("Status")!.SetValue(fono, StatusFonograma.Liberado);
        return fono;
    }

    private Titular CriarTitular()
        => Titular.CriarPessoaFisica("Artista", Cpf.Create("12345678909"), "BR", Guid.NewGuid());

    [Fact]
    public async Task HandleAsync_Duplicata_ThrowsConflictException()
    {
        var fonograma = CriarFonograma();
        var titular = CriarTitular();
        var cmd = new AdicionarParticipacaoCommand(fonograma.Id, titular.Id, "INTERPRETE");

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _titularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titular);
        _participacaoRepo.Setup(r => r.ExisteDuplicataAsync(fonograma.Id, titular.Id, CategoriaConexo.Interprete, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task HandleAsync_FonogramaLiberado_ThrowsDepuracaoException()
    {
        var fonograma = CriarFonograma(StatusFonograma.Liberado);
        var cmd = new AdicionarParticipacaoCommand(fonograma.Id, Guid.NewGuid(), "INTERPRETE");

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

    [Fact]
    public async Task HandleAsync_FonogramaDepurado_ThrowsDomainException()
    {
        var fonograma = CriarFonograma(StatusFonograma.Depurado);
        var cmd = new AdicionarParticipacaoCommand(fonograma.Id, Guid.NewGuid(), "INTERPRETE");

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }
}
