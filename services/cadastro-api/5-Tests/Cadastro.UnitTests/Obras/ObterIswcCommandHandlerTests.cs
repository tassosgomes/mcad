using Cadastro.Application.Audit;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Cadastro.Infra.Events;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class ObterIswcCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IIswcService> _iswcMock;
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IOutboxEventWriter> _outboxMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly ObterIswcCommandHandler _handler;

    public ObterIswcCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _iswcMock = new Mock<IIswcService>();
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _outboxMock = new Mock<IOutboxEventWriter>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new ObterIswcCommandHandler(
            _repoMock.Object,
            _iswcMock.Object,
            _titularidadeRepoMock.Object,
            _outboxMock.Object,
            _auditMock.Object);
    }

    [Fact]
    public async Task HandleAsync_Pendente_SemTitulares_DeveLancarDomainException422()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral>());

        var command = new ObterIswcCommand(obra.Id);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        
        await act.Should().ThrowAsync<DomainException>();
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NaoPendente_DeveLancarDomainException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123"); // turns to Liberado
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new ObterIswcCommand(obra.Id);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("ISWC só pode ser solicitado para obras PENDENTES.");
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_IswcDuplicado_DeveLancarConflictException()
    {
        // Arrange: obra Pendente
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);

        // Criar titular com associação (necessário para obter sigla)
        var associacaoId = Guid.NewGuid();
        var titular = Titular.CriarPessoaFisica("Nome Autor", Cpf.Create("12345678909"), "BR", associacaoId);

        // Criar titularidade e injetar a navegação Titular via reflexão
        var titularidade = TitularidadeAutoral.Criar(obra.Id, titular.Id, CategoriaAutoral.Autor, 100m);
        typeof(TitularidadeAutoral).GetProperty("Titular")!.SetValue(titularidade, titular);

        // Injetar a navegação Associacao no Titular (Associacao?.Sigla pode ser null — está ok, handler usa ?? "UNKNOWN")
        // Não é necessário criar Associacao: o handler aceita null via ?.Sigla ?? "UNKNOWN".

        var iswcRetornado = "T-123.456.789-0";

        _repoMock
            .Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(obra);

        _titularidadeRepoMock
            .Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral> { titularidade });

        _iswcMock
            .Setup(s => s.ObterIswcAsync(
                obra.Titulo,
                It.IsAny<string[]>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(iswcRetornado);

        _repoMock
            .Setup(r => r.ExisteIswcAsync(iswcRetornado, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var command = new ObterIswcCommand(obra.Id);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*já está vinculado*");

        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
