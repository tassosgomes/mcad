using AwesomeAssertions;
using Cadastro.Application.Distribuicao.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Distribuicao;

public class ObterOwnershipSnapshotQueryHandlerTests
{
    private readonly Mock<IObraRepository> _obraRepository = new();
    private readonly Mock<IFonogramaRepository> _fonogramaRepository = new();
    private readonly Mock<ITitularidadeRepository> _titularidadeRepository = new();
    private readonly Mock<IParticipacaoRepository> _participacaoRepository = new();
    private readonly ObterOwnershipSnapshotQueryHandler _handler;

    public ObterOwnershipSnapshotQueryHandlerTests()
    {
        _handler = new ObterOwnershipSnapshotQueryHandler(
            _obraRepository.Object,
            _fonogramaRepository.Object,
            _titularidadeRepository.Object,
            _participacaoRepository.Object);
    }

    [Fact]
    public async Task HandleAsync_ComObraETitularidades_DeveRetornarSnapshotAutoral()
    {
        var obraId = Guid.NewGuid();
        var obra = CriarObra(obraId, "Aquarela do Brasil");
        var associacao = new Associacao(Guid.NewGuid(), "União Brasileira de Compositores", "UBC", "00000000000100");
        var autor = CriarTitular("Autor Um", associacao, "12345678909");
        var editor = CriarTitular("Editora Dois", associacao, "98765432100");
        var titularidades = new[]
        {
            CriarTitularidade(obraId, autor, CategoriaAutoral.Autor, 60m),
            CriarTitularidade(obraId, editor, CategoriaAutoral.Editor, 40m)
        };

        _obraRepository
            .Setup(repository => repository.GetByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([obra]);
        _titularidadeRepository
            .Setup(repository => repository.GetByObraIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(titularidades);

        var result = await _handler.HandleAsync(new ObterOwnershipSnapshotQuery([obraId], []), CancellationToken.None);

        result.Obras.Should().ContainSingle();
        var obraSnapshot = result.Obras.Single();
        obraSnapshot.ObraId.Should().Be(obraId);
        obraSnapshot.Titulo.Should().Be("Aquarela do Brasil");
        obraSnapshot.Status.Should().Be("PENDENTE");
        obraSnapshot.Titularidades.Should().HaveCount(2);
        obraSnapshot.Titularidades.Should().Contain(t =>
            t.TitularId == autor.Id &&
            t.Nome == "Autor Um" &&
            t.AssociacaoSigla == "UBC" &&
            t.Categoria == "AUTOR" &&
            t.Percentual == 60m);
    }

    [Fact]
    public async Task HandleAsync_ComFonogramaEParticipacoes_DeveRetornarSnapshotConexo()
    {
        var obraId = Guid.NewGuid();
        var fonograma = CriarFonograma(Guid.NewGuid(), obraId);
        var associacao = new Associacao(Guid.NewGuid(), "Associação Brasileira", "ABRAMUS", "00000000000100");
        var interprete = CriarTitular("Interprete Um", associacao, "12345678909");
        var produtor = CriarTitular("Produtor Dois", associacao, "98765432100");
        var participacoes = new[]
        {
            CriarParticipacao(fonograma.Id, interprete, CategoriaConexo.Interprete, 55m),
            CriarParticipacao(fonograma.Id, produtor, CategoriaConexo.ProdutorFonografico, 45m)
        };

        _fonogramaRepository
            .Setup(repository => repository.GetByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([fonograma]);
        _participacaoRepository
            .Setup(repository => repository.GetByFonogramaIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(participacoes);

        var result = await _handler.HandleAsync(new ObterOwnershipSnapshotQuery([], [fonograma.Id]), CancellationToken.None);

        result.Fonogramas.Should().ContainSingle();
        var fonogramaSnapshot = result.Fonogramas.Single();
        fonogramaSnapshot.FonogramaId.Should().Be(fonograma.Id);
        fonogramaSnapshot.ObraId.Should().Be(obraId);
        fonogramaSnapshot.Status.Should().Be("PENDENTE_VALIDACAO");
        fonogramaSnapshot.Participacoes.Should().Contain(p =>
            p.TitularId == produtor.Id &&
            p.Nome == "Produtor Dois" &&
            p.AssociacaoSigla == "ABRAMUS" &&
            p.Categoria == "PRODUTOR_FONOGRAFICO" &&
            p.Percentual == 45m);
    }

    [Fact]
    public async Task HandleAsync_ComObraInexistente_DeveLancarErroDeNegocio()
    {
        var obraId = Guid.NewGuid();
        _obraRepository
            .Setup(repository => repository.GetByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var act = () => _handler.HandleAsync(new ObterOwnershipSnapshotQuery([obraId], []), CancellationToken.None);

        await act.Should()
            .ThrowAsync<DomainException>()
            .WithMessage($"*{obraId}*");
    }

    [Fact]
    public async Task HandleAsync_ComFonogramaInexistente_DeveLancarErroDeNegocio()
    {
        var fonogramaId = Guid.NewGuid();
        _fonogramaRepository
            .Setup(repository => repository.GetByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var act = () => _handler.HandleAsync(new ObterOwnershipSnapshotQuery([], [fonogramaId]), CancellationToken.None);

        await act.Should()
            .ThrowAsync<DomainException>()
            .WithMessage($"*{fonogramaId}*");
    }

    private static ObraMusical CriarObra(Guid id, string titulo)
    {
        var obra = ObraMusical.Criar(titulo, TipoObra.Musical);
        typeof(ObraMusical).GetProperty(nameof(ObraMusical.Id))!.SetValue(obra, id);
        return obra;
    }

    private static Fonograma CriarFonograma(Guid id, Guid obraId)
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2400001"), obraId, "BR");
        typeof(Fonograma).GetProperty(nameof(Fonograma.Id))!.SetValue(fonograma, id);
        return fonograma;
    }

    private static Titular CriarTitular(string nome, Associacao associacao, string cpf)
    {
        var titular = Titular.CriarPessoaFisica(nome, Cpf.Create(cpf), "BR", associacao.Id);
        typeof(Titular).GetProperty(nameof(Titular.Associacao))!.SetValue(titular, associacao);
        return titular;
    }

    private static TitularidadeAutoral CriarTitularidade(
        Guid obraId,
        Titular titular,
        CategoriaAutoral categoria,
        decimal percentual)
    {
        var titularidade = TitularidadeAutoral.Criar(obraId, titular.Id, categoria, percentual);
        typeof(TitularidadeAutoral).GetProperty(nameof(TitularidadeAutoral.Titular))!.SetValue(titularidade, titular);
        return titularidade;
    }

    private static ParticipacaoConexa CriarParticipacao(
        Guid fonogramaId,
        Titular titular,
        CategoriaConexo categoria,
        decimal percentual)
    {
        var participacao = ParticipacaoConexa.Criar(fonogramaId, titular.Id, categoria);
        participacao.DefinirPercentual(percentual);
        typeof(ParticipacaoConexa).GetProperty(nameof(ParticipacaoConexa.Titular))!.SetValue(participacao, titular);
        return participacao;
    }
}
