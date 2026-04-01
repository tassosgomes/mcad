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

public class AjustarPercentualHandlerTests
{
    private readonly Mock<IParticipacaoRepository> _participacaoRepo = new();
    private readonly Mock<IFonogramaRepository> _fonogramaRepo = new();
    private readonly AjustarPercentualCommandHandler _handler;

    public AjustarPercentualHandlerTests()
    {
        _handler = new AjustarPercentualCommandHandler(_participacaoRepo.Object, _fonogramaRepo.Object);
    }

    private Fonograma CriarFonograma(StatusFonograma status = StatusFonograma.PendenteValidacao)
    {
        var fono = Fonograma.Criar(Isrc.Create("BRXYZ2300098"), Guid.NewGuid(), "BR");
        if (status != StatusFonograma.PendenteValidacao)
            typeof(Fonograma).GetProperty("Status")!.SetValue(fono, status);
        return fono;
    }

    [Fact]
    public async Task HandleAsync_AjusteInterprete_RetornaOk()
    {
        var fonograma = CriarFonograma();
        var titular = Titular.CriarPessoaFisica("ArtistaTeste", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var participacao = ParticipacaoConexa.Criar(fonograma.Id, titular.Id, CategoriaConexo.Interprete);
        typeof(ParticipacaoConexa).GetProperty("Titular")!.SetValue(participacao, titular);
        participacao.DefinirPercentual(21.85m);
        var cmd = new AjustarPercentualCommand(fonograma.Id, participacao.Id, 30.0m);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _participacaoRepo.Setup(r => r.GetByIdAsync(participacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participacao);
        _participacaoRepo.Setup(r => r.GetByFonogramaIdAsync(fonograma.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ParticipacaoConexa> { participacao });

        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.Should().NotBeNull();
        participacao.Percentual.Should().Be(30.0m);
    }

    [Fact]
    public async Task HandleAsync_AjusteMusico_ThrowsDomainException()
    {
        var fonograma = CriarFonograma();
        var participacao = ParticipacaoConexa.Criar(fonograma.Id, Guid.NewGuid(), CategoriaConexo.MusicoExecutante);
        participacao.DefinirPercentual(14.6m);
        var cmd = new AjustarPercentualCommand(fonograma.Id, participacao.Id, 10.0m);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _participacaoRepo.Setup(r => r.GetByIdAsync(participacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participacao);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*Músico Executante*");
    }

    [Fact]
    public async Task HandleAsync_FonogramaLiberado_ThrowsDepuracaoException()
    {
        var fonograma = CriarFonograma(StatusFonograma.Liberado);
        var cmd = new AjustarPercentualCommand(fonograma.Id, Guid.NewGuid(), 30.0m);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }
}
