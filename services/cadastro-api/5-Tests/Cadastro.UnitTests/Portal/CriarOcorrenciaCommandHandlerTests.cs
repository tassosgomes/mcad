using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ValidationException = Cadastro.Application.Common.Exceptions.ValidationException;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="CriarOcorrenciaCommandHandler"/> (RF-27 a RF-32).
/// Cobertura:
/// - RF-28: ocorrência nasce <c>ABERTA</c>.
/// - RF-32: outbox <c>AddEvent("cadastro.ocorrencia.aberta")</c> chamado no sucesso.
/// - RF-27: validação estrutural — descrição vazia/curta, tipo inválido → <c>ValidationException</c>.
/// - Persistência: <c>AddAsync</c> + <c>SaveChangesAsync</c> chamados uma vez no sucesso, never no erro.
/// </summary>
public class CriarOcorrenciaCommandHandlerTests
{
    private readonly Mock<IOcorrenciaRepository> _mockRepo;
    private readonly Mock<IValidator<CriarOcorrenciaCommand>> _mockValidator;
    private readonly Mock<IOutboxEventWriter> _mockOutbox;
    private readonly CriarOcorrenciaCommandHandler _handler;

    public CriarOcorrenciaCommandHandlerTests()
    {
        _mockRepo = new Mock<IOcorrenciaRepository>();
        _mockValidator = new Mock<IValidator<CriarOcorrenciaCommand>>();
        _mockOutbox = new Mock<IOutboxEventWriter>();

        // Validator estrutural sempre passa — testamos falhas específicas sobrescrevendo o setup.
        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        // AddAsync retorna a própria entidade recebida (simula EF Core).
        _mockRepo.Setup(r => r.AddAsync(It.IsAny<Ocorrencia>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Ocorrencia o, CancellationToken _) => o);

        _handler = new CriarOcorrenciaCommandHandler(
            _mockRepo.Object,
            _mockValidator.Object,
            _mockOutbox.Object,
            NullLogger<CriarOcorrenciaCommandHandler>.Instance);
    }

    private static CriarOcorrenciaCommand CommandValido(Guid titularId) => new(
        TitularId: titularId,
        Tipo: "TITULARIDADE_DIVERGENTE",
        ObraId: Guid.NewGuid(),
        FonogramaId: null,
        Descricao: "A obra Song X está com a titularidade divergente do contrato.");

    // ──────────────────────────────────────────────────────────────────────────
    // RF-28: ocorrência nasce ABERTA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComCommandValido_DeveCriarOcorrenciaNoStatusAberta()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — RF-28: a ocorrência nasce no status ABERTA.
        result.Should().NotBeNull();
        result.Status.Should().Be("ABERTA");
        result.Id.Should().NotBeEmpty();
        result.Tipo.Should().Be("TITULARIDADE_DIVERGENTE");
        result.Descricao.Should().Be(command.Descricao);
        result.AbertaEm.Should().NotBe(default);
        result.ResolvidaEm.Should().BeNull();
        result.Resolucao.Should().BeNull();

        // Persistência chamada uma vez.
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<Ocorrencia>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComCommandValido_DeveMapearTodosOsTiposParaScreamingSnakeCase()
    {
        // Arrange — RF-27: cada valor do enum deve mapear corretamente para string.
        var titularId = Guid.NewGuid();
        var casos = new[]
        {
            ("TITULARIDADE_DIVERGENTE", TipoOcorrencia.TitularidadeDivergente),
            ("FONOGRAMA_INCORRETO", TipoOcorrencia.FonogramaIncorreto),
            ("DADO_CADASTRAL", TipoOcorrencia.DadoCadastral),
            ("OBRA_AUSENTE", TipoOcorrencia.ObraAusente)
        };

        foreach (var (tipoStr, tipoEsperado) in casos)
        {
            // Act
            var result = await _handler.HandleAsync(
                CommandValido(titularId) with { Tipo = tipoStr },
                CancellationToken.None);

            // Assert
            result.Tipo.Should().Be(tipoStr, $"o enum {tipoEsperado} deve serializar para SCREAMING_SNAKE_CASE");
            result.Status.Should().Be("ABERTA");
        }
    }

    [Fact]
    public async Task HandleAsync_SemObraNemFonograma_DeveAceitarParaDadoCadastral()
    {
        // Arrange — RF-27: ObraId/FonogramaId mutuamente opcionais (caso DADO_CADASTRAL).
        var titularId = Guid.NewGuid();
        var command = new CriarOcorrenciaCommand(
            TitularId: titularId,
            Tipo: "DADO_CADASTRAL",
            ObraId: null,
            FonogramaId: null,
            Descricao: "Meu nome cadastrado está incorreto na base.");

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.ObraId.Should().BeNull();
        result.FonogramaId.Should().BeNull();
        result.Status.Should().Be("ABERTA");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-32: evento outbox cadastro.ocorrencia.aberta
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComCommandValido_DevePublicarEventoOcorrenciaAberta()
    {
        // Arrange — RF-32: evento cadastro.ocorrencia.aberta no outbox.
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — AddEvent chamado com o routing key exato e subject = ocorrenciaId.
        _mockOutbox.Verify(
            o => o.AddEvent(
                "cadastro.ocorrencia.aberta",
                result.Id.ToString(),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComFalhaDeValidacao_NaoDevePublicarEventoNemPersistir()
    {
        // Arrange — validator falha; nada deve ser persistido nem publicado.
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId);

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Descricao", "Descrição deve ter no mínimo 10 caracteres")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("Descricao");
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<Ocorrencia>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _mockOutbox.Verify(
            o => o.AddEvent(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()),
            Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-27: validação estrutural — Descrição vazia/curta e Tipo inválido
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComDescricaoVazia_DeveLancarValidationException()
    {
        // Arrange — descrição vazia falha na validação estrutural (RF-27).
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId) with { Descricao = "" };

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Descricao", "Descrição é obrigatória")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("Descricao");
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComDescricaoMuitoCurta_DeveLancarValidationException()
    {
        // Arrange — RF-27: descrição com menos de 10 caracteres é rejeitada pelo validator.
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId) with { Descricao = "curta" };

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Descricao", "Descrição deve ter no mínimo 10 caracteres")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors["Descricao"].Should().Contain(e => e.Contains("10"));
    }

    [Fact]
    public async Task HandleAsync_ComTipoInvalido_DeveLancarValidationException()
    {
        // Arrange — RF-27: tipo não mapeia para nenhum valor do enum TipoOcorrencia.
        var titularId = Guid.NewGuid();
        var command = CommandValido(titularId) with { Tipo = "TIPO_INEXISTENTE" };

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Tipo", "Tipo inválido")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("Tipo");
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComTitularIdVazio_DeveFalharValidacao()
    {
        // Arrange — anti-tampering: TitularId não pode ser Guid.Empty.
        var command = CommandValido(Guid.Empty);

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarOcorrenciaCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("TitularId", "TitularId é obrigatório")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("TitularId");
    }
}
