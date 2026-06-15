using AwesomeAssertions;
using Cadastro.Application.Portal.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="ObterMeusFonogramasQueryHandler"/> (RF-23, RF-24).
/// Cobertura:
/// - RF-23: retorna fonogramas com ISRC formatado, título da obra vinculada, papel/percentual.
/// - RF-24: isolamento — handler usa apenas <paramref name="TitularId"/> da query (token).
/// </summary>
public class ObterMeusFonogramasQueryHandlerTests
{
    private readonly Mock<IParticipacaoRepository> _participacaoRepository = new();
    private readonly ObterMeusFonogramasQueryHandler _handler;

    public ObterMeusFonogramasQueryHandlerTests()
    {
        _handler = new ObterMeusFonogramasQueryHandler(_participacaoRepository.Object);
    }

    private static ObraMusical CriarObra(Guid id, string titulo)
    {
        var obra = ObraMusical.Criar(titulo, TipoObra.Musical);
        typeof(ObraMusical).GetProperty(nameof(ObraMusical.Id))!.SetValue(obra, id);
        return obra;
    }

    private static Fonograma CriarFonograma(Guid id, ObraMusical obra, string isrc = "BRABC2400001")
    {
        var fonograma = Fonograma.Criar(Isrc.Create(isrc), obra.Id, "BR");
        typeof(Fonograma).GetProperty(nameof(Fonograma.Id))!.SetValue(fonograma, id);
        // Navegação Obra populada pelo Include do EF Core; em unit test, via reflexão.
        typeof(Fonograma).GetProperty(nameof(Fonograma.Obra))!.SetValue(fonograma, obra);
        return fonograma;
    }

    private static ParticipacaoConexa CriarParticipacao(
        Guid titularId,
        Fonograma fonograma,
        CategoriaConexo categoria,
        decimal? percentual = null)
    {
        var participacao = ParticipacaoConexa.Criar(fonograma.Id, titularId, categoria);
        if (percentual is not null)
        {
            participacao.DefinirPercentual(percentual.Value);
        }
        typeof(ParticipacaoConexa).GetProperty(nameof(ParticipacaoConexa.Fonograma))!.SetValue(participacao, fonograma);
        return participacao;
    }

    [Fact]
    public async Task HandleAsync_DeveRetornarSomenteParticipacoesDoTitularAutenticado()
    {
        // Arrange — RF-24: handler repassa apenas o titularId do token ao repositório.
        var titularId = Guid.NewGuid();
        var outroTitularId = Guid.NewGuid();
        var obra = CriarObra(Guid.NewGuid(), "Garota de Ipanema");
        var fono1 = CriarFonograma(Guid.NewGuid(), obra, "BRXYZ2400001");
        var fono2 = CriarFonograma(Guid.NewGuid(), obra, "BRXYZ2400002");

        _participacaoRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarParticipacao(titularId, fono1, CategoriaConexo.Interprete, 50m),
                CriarParticipacao(titularId, fono2, CategoriaConexo.ProdutorFonografico, 50m)
            });

        var query = new ObterMeusFonogramasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — RF-23: resposta contém apenas as participações do titular.
        result.Data.Should().HaveCount(2);

        var p1 = result.Data.First(p => p.FonogramaId == fono1.Id);
        p1.TituloObra.Should().Be("Garota de Ipanema");
        p1.Isrc.Should().Be("BR-XYZ-24-00001");
        p1.Papel.Should().Be("INTERPRETE");
        p1.Percentual.Should().Be(50m);

        var p2 = result.Data.First(p => p.FonogramaId == fono2.Id);
        p2.Papel.Should().Be("PRODUTOR_FONOGRAFICO");
        p2.Isrc.Should().Be("BR-XYZ-24-00002");

        // RF-24: repositório só foi chamado com o titularId do token.
        _participacaoRepository.Verify(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()), Times.Once);
        _participacaoRepository.Verify(r => r.GetByTitularIdAsync(outroTitularId, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DeveRetornarPercentualNuloQuandoAindaNaoCalculado()
    {
        // Arrange — RF-23: participações recém-criadas têm Percentual null até cálculo.
        var titularId = Guid.NewGuid();
        var obra = CriarObra(Guid.NewGuid(), "Asa Branca");
        var fono = CriarFonograma(Guid.NewGuid(), obra, "BRABA2300001");

        _participacaoRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarParticipacao(titularId, fono, CategoriaConexo.MusicoExecutante)
            });

        var query = new ObterMeusFonogramasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().ContainSingle();
        result.Data.First().Percentual.Should().BeNull();
        result.Data.First().Papel.Should().Be("MUSICO_EXECUTANTE");
    }

    [Fact]
    public async Task HandleAsync_DeveAplicarFiltroPorTituloDaObra()
    {
        // Arrange — filtro sobre título da obra vinculada.
        var titularId = Guid.NewGuid();
        var obraA = CriarObra(Guid.NewGuid(), "Aquarela do Brasil");
        var obraB = CriarObra(Guid.NewGuid(), "Garota de Ipanema");
        var fonoA = CriarFonograma(Guid.NewGuid(), obraA, "BRABC2400001");
        var fonoB = CriarFonograma(Guid.NewGuid(), obraB, "BRABC2400002");

        _participacaoRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarParticipacao(titularId, fonoA, CategoriaConexo.Interprete, 50m),
                CriarParticipacao(titularId, fonoB, CategoriaConexo.Interprete, 50m)
            });

        var query = new ObterMeusFonogramasQuery(TitularId: titularId, Filtro: "ipanema");

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().ContainSingle();
        result.Data.First().TituloObra.Should().Be("Garota de Ipanema");
    }

    [Fact]
    public async Task HandleAsync_DeveOrdenarPorTituloAscPorPadrao()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var obraA = CriarObra(Guid.NewGuid(), "Samba de Verão");
        var obraB = CriarObra(Guid.NewGuid(), "Aquarela do Brasil");
        var fonoA = CriarFonograma(Guid.NewGuid(), obraA, "BRABC2400001");
        var fonoB = CriarFonograma(Guid.NewGuid(), obraB, "BRABC2400002");

        _participacaoRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarParticipacao(titularId, fonoA, CategoriaConexo.Interprete, 50m),
                CriarParticipacao(titularId, fonoB, CategoriaConexo.Interprete, 50m)
            });

        var query = new ObterMeusFonogramasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Select(p => p.TituloObra).Should().BeInAscendingOrder();
        result.Data.First().TituloObra.Should().Be("Aquarela do Brasil");
    }

    [Fact]
    public async Task HandleAsync_ComListaVazia_DeveRetornarPaginacaoZero()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        _participacaoRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var query = new ObterMeusFonogramasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
