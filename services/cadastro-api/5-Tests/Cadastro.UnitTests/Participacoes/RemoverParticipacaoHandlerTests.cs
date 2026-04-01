using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Participacoes;

public class RemoverParticipacaoHandlerTests
{
    private readonly Mock<IParticipacaoRepository> _participacaoRepo = new();
    private readonly Mock<IFonogramaRepository> _fonogramaRepo = new();
    private readonly RemoverParticipacaoCommandHandler _handler;

    public RemoverParticipacaoHandlerTests()
    {
        _handler = new RemoverParticipacaoCommandHandler(_participacaoRepo.Object, _fonogramaRepo.Object);
    }

    private Fonograma CriarFonograma(StatusFonograma status = StatusFonograma.PendenteValidacao)
    {
        var fono = Fonograma.Criar(Isrc.Create("BRXYZ2300097"), Guid.NewGuid(), "BR");
        if (status != StatusFonograma.PendenteValidacao)
            typeof(Fonograma).GetProperty("Status")!.SetValue(fono, status);
        return fono;
    }

    [Fact]
    public async Task HandleAsync_HappyPath_RemoveERetornaDesatualizado()
    {
        var fonograma = CriarFonograma();
        var participacao = ParticipacaoConexa.Criar(fonograma.Id, Guid.NewGuid(), CategoriaConexo.Interprete);
        participacao.DefinirPercentual(50.0m); // tinha cálculo
        var cmd = new RemoverParticipacaoCommand(fonograma.Id, participacao.Id);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _participacaoRepo.Setup(r => r.GetByIdAsync(participacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participacao);
        _participacaoRepo.Setup(r => r.GetByFonogramaIdAsync(fonograma.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ParticipacaoConexa>());

        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.Should().NotBeNull();
        result.PercentuaisDesatualizados.Should().BeTrue();
        _participacaoRepo.Verify(r => r.Delete(participacao), Times.Once);
        _participacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_FonogramaLiberado_ThrowsDepuracaoException()
    {
        var fonograma = CriarFonograma(StatusFonograma.Liberado);
        var cmd = new RemoverParticipacaoCommand(fonograma.Id, Guid.NewGuid());

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

    [Fact]
    public async Task HandleAsync_ParticipacaoNaoEncontrada_ThrowsNotFoundException()
    {
        var fonograma = CriarFonograma();
        var cmd = new RemoverParticipacaoCommand(fonograma.Id, Guid.NewGuid());

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _participacaoRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((ParticipacaoConexa)null!);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
