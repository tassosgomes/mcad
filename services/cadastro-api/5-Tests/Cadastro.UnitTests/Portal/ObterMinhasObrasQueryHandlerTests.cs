using AwesomeAssertions;
using Cadastro.Application.Portal.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="ObterMinhasObrasQueryHandler"/> (RF-22, RF-24, RF-26).
/// Cobertura:
/// - RF-22: retorna somente obras onde o titular é autor/editor (filtragem por titularId).
/// - RF-24: isolamento — handler usa apenas <paramref name="TitularId"/> da query (token).
/// - RF-26: filtro por título aplicado; ordenação ASC/DESC por título.
/// </summary>
public class ObterMinhasObrasQueryHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepository = new();
    private readonly ObterMinhasObrasQueryHandler _handler;

    public ObterMinhasObrasQueryHandlerTests()
    {
        _handler = new ObterMinhasObrasQueryHandler(_titularidadeRepository.Object);
    }

    private static ObraMusical CriarObra(Guid id, string titulo, string? iswc = null)
    {
        var obra = ObraMusical.Criar(titulo, TipoObra.Musical);
        typeof(ObraMusical).GetProperty(nameof(ObraMusical.Id))!.SetValue(obra, id);
        if (iswc is not null)
        {
            typeof(ObraMusical).GetProperty(nameof(ObraMusical.Iswc))!.SetValue(obra, iswc);
        }
        return obra;
    }

    private static TitularidadeAutoral CriarTitularidade(
        Guid titularId,
        ObraMusical obra,
        CategoriaAutoral categoria,
        decimal percentual)
    {
        var titularidade = TitularidadeAutoral.Criar(obra.Id, titularId, categoria, percentual);
        // A navegação Obra só é populada pela leitura do EF Core; em unit test, setamos via reflexão.
        typeof(TitularidadeAutoral).GetProperty(nameof(TitularidadeAutoral.Obra))!.SetValue(titularidade, obra);
        return titularidade;
    }

    [Fact]
    public async Task HandleAsync_DeveRetornarSomenteObrasDoTitularAutenticado()
    {
        // Arrange — RF-24: o handler repassa apenas titularId do token ao repositório.
        var titularId = Guid.NewGuid();
        var outroTitularId = Guid.NewGuid();
        var obra1 = CriarObra(Guid.NewGuid(), "Aquarela do Brasil", iswc: "T0101234567");
        var obra2 = CriarObra(Guid.NewGuid(), "Carinhoso");

        // O mock simula o filtro do repositório: só retorna titularidades do titularId informado.
        var titularidades = new[]
        {
            CriarTitularidade(titularId, obra1, CategoriaAutoral.Autor, 60m),
            CriarTitularidade(titularId, obra2, CategoriaAutoral.Editor, 40m)
        };
        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titularidades);

        var query = new ObterMinhasObrasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — RF-22: resposta contém apenas as titularidades do titularId do token.
        result.Data.Should().HaveCount(2);
        result.Data.Should().Contain(o => o.ObraId == obra1.Id && o.Titulo == "Aquarela do Brasil");
        result.Data.Should().Contain(o => o.ObraId == obra2.Id && o.Titulo == "Carinhoso");

        // RF-22: categoria e percentual projetados; ISWC presente quando existir.
        var aquarela = result.Data.First(o => o.ObraId == obra1.Id);
        aquarela.Categoria.Should().Be("AUTOR");
        aquarela.Percentual.Should().Be(60m);
        aquarela.Iswc.Should().Be("T0101234567");

        // RF-22: ISWC nulo quando não atribuído.
        var carinhoso = result.Data.First(o => o.ObraId == obra2.Id);
        carinhoso.Iswc.Should().BeNull();

        // RF-24: repositório foi chamado apenas com o titularId do token.
        _titularidadeRepository.Verify(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()), Times.Once);
        _titularidadeRepository.Verify(r => r.GetByTitularIdAsync(outroTitularId, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DeveAplicarFiltroPorTituloCaseInsensitive()
    {
        // Arrange — RF-26: filtro por título (contains, case-insensitive).
        var titularId = Guid.NewGuid();
        var obraA = CriarObra(Guid.NewGuid(), "Aquarela do Brasil");
        var obraB = CriarObra(Guid.NewGuid(), "Garota de Ipanema");
        var obraC = CriarObra(Guid.NewGuid(), "Samba de Verão");

        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarTitularidade(titularId, obraA, CategoriaAutoral.Autor, 100m),
                CriarTitularidade(titularId, obraB, CategoriaAutoral.Autor, 100m),
                CriarTitularidade(titularId, obraC, CategoriaAutoral.Autor, 100m)
            });

        // Act — filtro "a" deve capturar obras que contêm "a" (Aquarela, Ipanema).
        var query = new ObterMinhasObrasQuery(TitularId: titularId, Filtro: "AQUARELA");
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().ContainSingle(o => o.Titulo == "Aquarela do Brasil");
        result.Pagination.Total.Should().Be(1);
    }

    [Fact]
    public async Task HandleAsync_DeveOrdenarPorTituloAscPorPadrao()
    {
        // Arrange — RF-26: default sort = título ASC.
        var titularId = Guid.NewGuid();
        var obraA = CriarObra(Guid.NewGuid(), "Carinhoso");
        var obraB = CriarObra(Guid.NewGuid(), "Aquarela do Brasil");
        var obraC = CriarObra(Guid.NewGuid(), "Samba de Verão");

        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                CriarTitularidade(titularId, obraA, CategoriaAutoral.Autor, 100m),
                CriarTitularidade(titularId, obraB, CategoriaAutoral.Autor, 100m),
                CriarTitularidade(titularId, obraC, CategoriaAutoral.Autor, 100m)
            });

        var query = new ObterMinhasObrasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — ordem alfabética ASC.
        result.Data.Select(o => o.Titulo).Should().BeInAscendingOrder();
        result.Data.First().Titulo.Should().Be("Aquarela do Brasil");
        result.Data.Last().Titulo.Should().Be("Samba de Verão");
    }

    [Fact]
    public async Task HandleAsync_ComSortPrefixoMenos_DeveOrdenarDesc()
    {
        // Arrange — RF-26: prefixo "-" inverte a ordem (DESC).
        var titularId = Guid.NewGuid();
        var obras = new[]
        {
            CriarObra(Guid.NewGuid(), "Carinhoso"),
            CriarObra(Guid.NewGuid(), "Aquarela do Brasil"),
            CriarObra(Guid.NewGuid(), "Samba de Verão")
        };

        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(obras.Select(o => CriarTitularidade(titularId, o, CategoriaAutoral.Autor, 100m)).ToArray());

        var query = new ObterMinhasObrasQuery(TitularId: titularId, Sort: "-titulo");

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — ordem DESC.
        result.Data.Select(o => o.Titulo).Should().BeInDescendingOrder();
    }

    [Fact]
    public async Task HandleAsync_DeveAplicarPaginacaoCorretamente()
    {
        // Arrange — paginação Page=2, Size=2 sobre 5 obras ordenadas por título.
        var titularId = Guid.NewGuid();
        var titulos = new[] { "E", "D", "C", "B", "A" };
        var obras = titulos
            .Select(t => CriarObra(Guid.NewGuid(), t))
            .Select(o => CriarTitularidade(titularId, o, CategoriaAutoral.Autor, 100m))
            .ToArray();

        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(obras);

        var query = new ObterMinhasObrasQuery(TitularId: titularId, Page: 2, Size: 2);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — ordenado: [A, B, C, D, E]; página 2 size 2 = [C, D].
        result.Data.Select(o => o.Titulo).Should().Equal("C", "D");
        result.Pagination.Total.Should().Be(5);
        result.Pagination.TotalPages.Should().Be(3);
        result.Pagination.Page.Should().Be(2);
        result.Pagination.Size.Should().Be(2);
    }

    [Fact]
    public async Task HandleAsync_ComListaVazia_DeveRetornarPaginacaoZero()
    {
        // Arrange — titular sem obras.
        var titularId = Guid.NewGuid();
        _titularidadeRepository
            .Setup(r => r.GetByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var query = new ObterMinhasObrasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
