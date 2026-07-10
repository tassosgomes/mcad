using AwesomeAssertions;
using Cadastro.Application.Audit;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Repertorios;
using Cadastro.Application.Repertorios.Commands;
using Cadastro.Application.Repertorios.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using FluentValidation.Results;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Repertorios;

public class RegistrarRepertorioCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _titularRepo;
    private readonly Mock<IAssociacaoRepository> _associacaoRepo;
    private readonly Mock<IObraRepository> _obraRepo;
    private readonly Mock<IFonogramaRepository> _fonogramaRepo;
    private readonly Mock<ICadastroUnitOfWork> _unitOfWork;
    private readonly Mock<ICadastroTransaction> _transaction;
    private readonly Mock<IIswcService> _iswcService;
    private readonly Mock<IOutboxEventWriter> _outbox;
    private readonly Mock<ITitularAuditPublisher> _titularAuditPub;
    private readonly Mock<IObraAuditPublisher> _obraAuditPub;
    private readonly Mock<IFonogramaAuditPublisher> _fonogramaAuditPub;
    private readonly Mock<ITitularidadeAuditPublisher> _titularidadeAuditPub;
    private readonly Mock<IParticipacaoAuditPublisher> _participacaoAuditPub;
    private readonly Mock<IValidator<RegistrarRepertorioCommand>> _validator;
    private readonly RegistrarRepertorioCommandHandler _handler;

    private readonly Associacao _associacaoPadrao;

    public RegistrarRepertorioCommandHandlerTests()
    {
        _titularRepo = new Mock<ITitularRepository>();
        _associacaoRepo = new Mock<IAssociacaoRepository>();
        _obraRepo = new Mock<IObraRepository>();
        _fonogramaRepo = new Mock<IFonogramaRepository>();
        _unitOfWork = new Mock<ICadastroUnitOfWork>();
        _transaction = new Mock<ICadastroTransaction>();
        _iswcService = new Mock<IIswcService>();
        _outbox = new Mock<IOutboxEventWriter>();
        _titularAuditPub = new Mock<ITitularAuditPublisher>();
        _obraAuditPub = new Mock<IObraAuditPublisher>();
        _fonogramaAuditPub = new Mock<IFonogramaAuditPublisher>();
        _titularidadeAuditPub = new Mock<ITitularidadeAuditPublisher>();
        _participacaoAuditPub = new Mock<IParticipacaoAuditPublisher>();
        _validator = new Mock<IValidator<RegistrarRepertorioCommand>>();

        _associacaoPadrao = new Associacao(Guid.NewGuid(), "ABRAMUS", "ABRAMUS", "50997063000132");

        _handler = new RegistrarRepertorioCommandHandler(
            _titularRepo.Object,
            _associacaoRepo.Object,
            _obraRepo.Object,
            _fonogramaRepo.Object,
            _unitOfWork.Object,
            _iswcService.Object,
            _outbox.Object,
            _titularAuditPub.Object,
            _obraAuditPub.Object,
            _fonogramaAuditPub.Object,
            _titularidadeAuditPub.Object,
            _participacaoAuditPub.Object,
            _validator.Object);

        SetupValidatorSuccess();
        SetupTransactionDefaults();
        SetupSnapshotDefaults();
    }

    private void SetupValidatorSuccess()
    {
        _validator.Setup(v => v.ValidateAsync(It.IsAny<RegistrarRepertorioCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());
    }

    private void SetupTransactionDefaults()
    {
        _unitOfWork.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(_transaction.Object);
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
    }

    private void SetupSnapshotDefaults()
    {
        _obraAuditPub.Setup(a => a.Snapshot(It.IsAny<ObraMusical>()))
            .Returns(new Dictionary<string, object?>());
        _fonogramaAuditPub.Setup(a => a.Snapshot(It.IsAny<Fonograma>()))
            .Returns(new Dictionary<string, object?>());
    }

    // -------------------------------------------------------------------------
    // 1. Sucesso com ISWC: Obra LIBERADA, Fonogramas released
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_ComIswc_ObraLiberadaFonogramasComUrlLiberados()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor Silva", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = CreateValidCommand(titularExistenteId: titularExistente.Id, salvarComoPendente: false);
        SetupTitularExistente(titularExistente);
        SetupIswcSucesso("T-123.456.789-0");
        SetupIswcNaoExiste();

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.ObraId.Should().NotBeEmpty();
        result.StatusObra.Should().Be("LIBERADO");
        result.Iswc.Should().Be("T-123.456.789-0");
        result.IswcObtido.Should().BeTrue();
        result.Fonogramas.Should().HaveCount(1);
        result.Fonogramas.First().Status.Should().Be("LIBERADO");

        _transaction.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        _transaction.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 2. Sucesso pendente: Obra PENDENTE, sem chamada ISWC
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_SalvarComoPendente_ObraPendenteSemChamarIswc()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor Silva", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = CreateValidCommand(titularExistenteId: titularExistente.Id, salvarComoPendente: true);
        SetupTitularExistente(titularExistente);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.StatusObra.Should().Be("PENDENTE");
        result.Iswc.Should().BeNull();
        result.IswcObtido.Should().BeFalse();
        result.Fonogramas.First().Status.Should().Be("PENDENTEDOCUMENTACAO");

        _iswcService.Verify(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _outbox.Verify(o => o.AddEvent("cadastro.obra.liberada", It.IsAny<string>(), It.IsAny<object>()), Times.Never);
        _outbox.Verify(o => o.AddEvent("cadastro.fonograma.liberado", It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 3. Titular existente reutilizado corretamente
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_TitularExistentePorTitularId_DeveReutilizar()
    {
        var associacao = new Associacao(Guid.NewGuid(), "UBC", "UBC", "50997063000132");
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor Existente", Cpf.Create("98765432100"), "BR", associacao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, associacao);

        _associacaoRepo.Setup(r => r.GetByIdAsync(associacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        var titulares = new List<TitularRepertorioInput>
        {
            new(titularExistente.Id, null)
        };

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            titulares,
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(associacao);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        _titularRepo.Verify(r => r.GetByIdAsync(titularExistente.Id, It.IsAny<CancellationToken>()), Times.Once);
        _titularRepo.Verify(r => r.AddAsync(It.IsAny<Titular>(), It.IsAny<CancellationToken>()), Times.Never);
        result.ObraId.Should().NotBeEmpty();
    }

    // -------------------------------------------------------------------------
    // 4. Novo titular criado
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_NovoTitular_DeveCriarEAuditar()
    {
        var command = CreateValidCommandComNovoTitular(salvarComoPendente: true);

        SetupTitularNaoExiste();
        SetupAssociacao(_associacaoPadrao);
        _titularRepo.Setup(r => r.AddAsync(It.IsAny<Titular>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular t, CancellationToken _) => t);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        _titularRepo.Verify(r => r.AddAsync(It.IsAny<Titular>(), It.IsAny<CancellationToken>()), Times.Once);
        _titularAuditPub.Verify(a => a.PublishAsync(It.IsAny<Titular>(), TitularAuditOperation.Create, null, It.IsAny<CancellationToken>()), Times.Once);
        _outbox.Verify(o => o.AddEvent("cadastro.titular.criado", It.IsAny<string>(), It.IsAny<object>()), Times.Once);
        result.TitularesCriados.Should().HaveCount(1);
    }

    // -------------------------------------------------------------------------
    // 5. Documento duplicado no payload
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_DocumentoDuplicadoNoPayload_DeveLancarConflictException()
    {
        var command = CreateValidCommandComDoisNovosTitularesMesmoDocumento(salvarComoPendente: true);

        SetupTitularNaoExiste();
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*documento*");
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 6. Documento já existe no DB
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_DocumentoJaExisteNoBanco_DeveLancarConflictException()
    {
        var command = CreateValidCommandComNovoTitular(salvarComoPendente: true);

        SetupAssociacao(_associacaoPadrao);
        _titularRepo.Setup(r => r.ExisteDocumentoAsync("50997063000132", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*titular cadastrado*");
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 7. Soma autoral != 100%
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_SomaAutoralDiferente100_DeveLancarDomainException()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor Silva", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 50)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*100*");
        _transaction.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 8. Editor PF
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_EditorPessoaFisica_DeveLancarDomainException()
    {
        var titularPF = Titular.CriarPessoaFisica(
            "Editor PF", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularPF, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularPF.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Editor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])],
            true);

        SetupTitularExistente(titularPF);
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Editor*Pessoa Jurídica*");
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 9. ISRC duplicado dentro do payload
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_IsrcDuplicadoNoPayload_DeveLancarConflictException()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [
                new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ]),
                new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/2.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*ISRC*duplicado*");
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 10. ISRC já existe no DB
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_IsrcJaExisteNoBanco_DeveLancarConflictException()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = CreateValidCommand(titularExistenteId: titularExistente.Id, salvarComoPendente: true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);
        _fonogramaRepo.Setup(r => r.ExisteIsrcAsync("BRABC2300001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*ISRC*");
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 11. Fonograma sem Intérprete
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_FonogramaSemInterprete_DeveLancarDomainException()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)])],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Intérprete*");
        _transaction.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 12. Fonograma sem Produtor Fonográfico
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_FonogramaSemProdutor_DeveLancarDomainException()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete)])],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Produtor*");
        _transaction.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 13. Rateio/arredondamento via CalculadoraConexos
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_ComMusicoExecutante_DeveCalcularRateioCorretamente()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Rateio", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.MusicoExecutante)
                ])],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.ObraId.Should().NotBeEmpty();
        result.Fonogramas.Should().HaveCount(1);
        _transaction.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 14. ISWC indisponível → RepertorioIswcIndisponivelException
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_IswcIndisponivel_DeveLancarIswcIndisponivelExceptionSemPersistencia()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = CreateValidCommand(titularExistenteId: titularExistente.Id, salvarComoPendente: false);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);
        _iswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Timeout"));

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<RepertorioIswcIndisponivelException>();
        _unitOfWork.Verify(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 15. Falha no segundo Fonograma → rollback
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_FalhaSegundoFonograma_DeveFazerRollback()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [
                new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ]),
                new FonogramaRepertorioInput("BRABC2300002", "BR", null, null, "https://audio.com/2.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        _fonogramaRepo.Setup(r => r.AddAsync(It.IsAny<Fonograma>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Fonograma f, CancellationToken _) =>
            {
                if (f.Isrc.Valor == "BRABC2300002")
                    throw new InvalidOperationException("Erro ao inserir segundo fonograma");
                return f;
            });

        var act = () => _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
        _transaction.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
        _transaction.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // 16. Dois Fonogramas criados com sucesso
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_DoisFonogramas_DeveCriarAmbos()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Dois Fonos", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularExistente.Id, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [
                new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ]),
                new FonogramaRepertorioInput("BRABC2300002", "BR", null, null, "https://audio.com/2.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ],
            true);

        SetupTitularExistente(titularExistente);
        SetupAssociacao(_associacaoPadrao);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Fonogramas.Should().HaveCount(2);
        result.FonogramaLinks.Should().HaveCount(2);
        _transaction.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // -------------------------------------------------------------------------
    // 17. Auditoria e outbox corretos
    // -------------------------------------------------------------------------
    [Fact]
    public async Task HandleAsync_ComIswcNovoTitular_DeveEscreverAuditEOutbox()
    {
        var titularExistente = Titular.CriarPessoaFisica(
            "Autor Silva", Cpf.Create("12345678909"), "BR", _associacaoPadrao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titularExistente, _associacaoPadrao);

        var command = CreateValidCommand(titularExistenteId: titularExistente.Id, salvarComoPendente: false);
        SetupTitularExistente(titularExistente);
        SetupIswcSucesso("T-123.456.789-0");
        SetupIswcNaoExiste();
        SetupAssociacao(_associacaoPadrao);

        await _handler.HandleAsync(command, CancellationToken.None);

        _obraAuditPub.Verify(a => a.PublishAsync(It.IsAny<ObraMusical>(), ObraAuditOperation.ObtainIswc, It.IsAny<IReadOnlyDictionary<string, object?>?>(), It.IsAny<CancellationToken>()), Times.Once);
        _outbox.Verify(o => o.AddEvent("cadastro.obra.liberada", It.IsAny<string>(), It.IsAny<object>()), Times.Once);
        _outbox.Verify(o => o.AddEvent("cadastro.fonograma.liberado", It.IsAny<string>(), It.IsAny<object>()), Times.Once);
        _titularidadeAuditPub.Verify(a => a.PublishAsync(It.IsAny<TitularidadeAutoral>(), TitularidadeAuditOperation.Add, null, It.IsAny<CancellationToken>()), Times.Once);
        _fonogramaAuditPub.Verify(a => a.PublishAsync(It.IsAny<Fonograma>(), FonogramaAuditOperation.Create, null, It.IsAny<CancellationToken>()), Times.Once);
        _participacaoAuditPub.Verify(a => a.PublishAsync(It.IsAny<ParticipacaoConexa>(), ParticipacaoAuditOperation.Add, null, It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private RegistrarRepertorioCommand CreateValidCommand(Guid? titularExistenteId = null, bool salvarComoPendente = false)
    {
        var titularId = titularExistenteId ?? Guid.NewGuid();

        return new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(titularId, null)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])],
            salvarComoPendente);
    }

    private RegistrarRepertorioCommand CreateValidCommandComNovoTitular(bool salvarComoPendente = false)
    {
        var novoTitular = new NovoTitularRepertorioInput(
            "Editora Nova", TipoTitular.PJ, "50997063000132", "BR", _associacaoPadrao.Id, null);

        return new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [new TitularRepertorioInput(null, novoTitular)],
            [new TitularidadeRepertorioInput("0", CategoriaAutoral.Editor, 100)],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])],
            salvarComoPendente);
    }

    private RegistrarRepertorioCommand CreateValidCommandComDoisNovosTitularesMesmoDocumento(bool salvarComoPendente = false)
    {
        var novoTitular = new NovoTitularRepertorioInput(
            "Editora A", TipoTitular.PJ, "50997063000132", "BR", _associacaoPadrao.Id, null);
        var novoTitularDuplicado = new NovoTitularRepertorioInput(
            "Editora B", TipoTitular.PJ, "50.997.063/0001-32", "BR", _associacaoPadrao.Id, null);

        return new RegistrarRepertorioCommand(
            new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            [
                new TitularRepertorioInput(null, novoTitular),
                new TitularRepertorioInput(null, novoTitularDuplicado)
            ],
            [
                new TitularidadeRepertorioInput("0", CategoriaAutoral.Editor, 60),
                new TitularidadeRepertorioInput("1", CategoriaAutoral.Autor, 40)
            ],
            [new FonogramaRepertorioInput("BRABC2300001", "BR", null, null, "https://audio.com/1.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("1", CategoriaConexo.ProdutorFonografico)
                ])],
            salvarComoPendente);
    }

    private void SetupTitularExistente(Titular titular)
    {
        _titularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
    }

    private void SetupTitularNaoExiste()
    {
        _titularRepo.Setup(r => r.ExisteDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _fonogramaRepo.Setup(r => r.ExisteIsrcAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
    }

    private void SetupAssociacao(Associacao associacao)
    {
        _associacaoRepo.Setup(r => r.GetByIdAsync(associacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);
    }

    private void SetupIswcSucesso(string iswc)
    {
        _iswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(iswc);
    }

    private void SetupIswcNaoExiste()
    {
        _obraRepo.Setup(r => r.ExisteIswcAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
    }
}
