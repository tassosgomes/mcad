using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Repertorios.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Repertorios.Commands;

public class RegistrarRepertorioCommandHandler
    : ICommandHandler<RegistrarRepertorioCommand, CadastroRepertorioResponse>
{
    private readonly ITitularRepository _titularRepository;
    private readonly IAssociacaoRepository _associacaoRepository;
    private readonly IObraRepository _obraRepository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ICadastroUnitOfWork _unitOfWork;
    private readonly IIswcService _iswcService;
    private readonly IOutboxEventWriter _outbox;
    private readonly ITitularAuditPublisher _titularAuditPublisher;
    private readonly IObraAuditPublisher _obraAuditPublisher;
    private readonly IFonogramaAuditPublisher _fonogramaAuditPublisher;
    private readonly ITitularidadeAuditPublisher _titularidadeAuditPublisher;
    private readonly IParticipacaoAuditPublisher _participacaoAuditPublisher;
    private readonly IValidator<RegistrarRepertorioCommand> _validator;

    public RegistrarRepertorioCommandHandler(
        ITitularRepository titularRepository,
        IAssociacaoRepository associacaoRepository,
        IObraRepository obraRepository,
        IFonogramaRepository fonogramaRepository,
        ICadastroUnitOfWork unitOfWork,
        IIswcService iswcService,
        IOutboxEventWriter outbox,
        ITitularAuditPublisher titularAuditPublisher,
        IObraAuditPublisher obraAuditPublisher,
        IFonogramaAuditPublisher fonogramaAuditPublisher,
        ITitularidadeAuditPublisher titularidadeAuditPublisher,
        IParticipacaoAuditPublisher participacaoAuditPublisher,
        IValidator<RegistrarRepertorioCommand> validator)
    {
        _titularRepository = titularRepository;
        _associacaoRepository = associacaoRepository;
        _obraRepository = obraRepository;
        _fonogramaRepository = fonogramaRepository;
        _unitOfWork = unitOfWork;
        _iswcService = iswcService;
        _outbox = outbox;
        _titularAuditPublisher = titularAuditPublisher;
        _obraAuditPublisher = obraAuditPublisher;
        _fonogramaAuditPublisher = fonogramaAuditPublisher;
        _titularidadeAuditPublisher = titularidadeAuditPublisher;
        _participacaoAuditPublisher = participacaoAuditPublisher;
        _validator = validator;
    }

    public async Task<CadastroRepertorioResponse> HandleAsync(
        RegistrarRepertorioCommand command, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Cadastro.Application.Common.Exceptions.ValidationException(errors);
        }

        var titularesInput = command.Titulares.ToList();
        var titularMap = new Dictionary<string, Titular>();

        for (int i = 0; i < titularesInput.Count; i++)
        {
            var input = titularesInput[i];
            var localKey = i.ToString();

            if (input.TitularId.HasValue)
            {
                var titular = await _titularRepository.GetByIdAsync(input.TitularId.Value, cancellationToken)
                    ?? throw new NotFoundException("Titular", input.TitularId.Value);
                titularMap[localKey] = titular;
            }
            else if (input.NovoTitular is not null)
            {
                var novoTitular = input.NovoTitular;
                var caeIpi = !string.IsNullOrWhiteSpace(novoTitular.CaeIpi)
                    ? CaeIpi.Create(novoTitular.CaeIpi)
                    : null;

                _ = await _associacaoRepository.GetByIdAsync(novoTitular.AssociacaoId, cancellationToken)
                    ?? throw new NotFoundException("Associacao", novoTitular.AssociacaoId);

                Titular titular;
                string documentoNormalizado;

                if (novoTitular.TipoPessoa == TipoTitular.PF)
                {
                    var cpf = Cpf.Create(novoTitular.Documento);
                    documentoNormalizado = cpf.Valor;
                    titular = Titular.CriarPessoaFisica(novoTitular.Nome, cpf, novoTitular.Nacionalidade, novoTitular.AssociacaoId, caeIpi);
                }
                else
                {
                    var cnpj = Cnpj.Create(novoTitular.Documento);
                    documentoNormalizado = cnpj.Valor;
                    titular = Titular.CriarPessoaJuridica(novoTitular.Nome, cnpj, novoTitular.Nacionalidade, novoTitular.AssociacaoId, caeIpi);
                }

                if (await _titularRepository.ExisteDocumentoAsync(documentoNormalizado, cancellationToken))
                    throw new ConflictException($"Já existe um titular cadastrado com o documento informado.");

                foreach (var existing in titularMap.Values)
                {
                    if (existing.Documento == documentoNormalizado)
                        throw new ConflictException("O documento informado já foi utilizado em outro titular do repertório.");
                }

                titularMap[localKey] = titular;
            }
        }

        ValidarTitularidadesAutorais(command, titularMap);
        ValidarFonogramasPayload(command, titularMap);
        await ValidarIsrcsUnicidadeAsync(command, cancellationToken);

        string? iswcObtido = null;
        if (!command.SalvarComoPendente)
        {
            iswcObtido = await ObterIswcAsync(command, titularMap, cancellationToken);
        }

        ICadastroTransaction? transaction = null;
        try
        {
            transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

            var obra = ObraMusical.Criar(command.Obra.Titulo, command.Obra.Tipo, command.Obra.Subtitulo, command.Obra.Genero);
            await _obraRepository.AddAsync(obra, cancellationToken);

            var titularesCriados = new List<Titular>();
            for (int i = 0; i < titularesInput.Count; i++)
            {
                var localKey = i.ToString();
                var input = titularesInput[i];
                if (input.NovoTitular is not null)
                {
                    var titular = titularMap[localKey];
                    await _titularRepository.AddAsync(titular, cancellationToken);
                    titularesCriados.Add(titular);

                    _outbox.AddEvent("cadastro.titular.criado", titular.Id.ToString(), new
                    {
                        titularId = titular.Id,
                        nome = titular.Nome,
                        tipo = titular.Tipo == TipoTitular.PF ? "PF" : "PJ",
                        documento = titular.DocumentoFormatado,
                    });

                    await _titularAuditPublisher.PublishAsync(titular, TitularAuditOperation.Create, before: null, cancellationToken);
                }
            }

            var titularidades = new List<TitularidadeAutoral>();
            foreach (var tid in command.Titularidades)
            {
                var titular = titularMap[tid.TitularLocalKey];
                var titularidade = TitularidadeAutoral.Criar(obra.Id, titular.Id, tid.Categoria, tid.Percentual);
                titularidades.Add(titularidade);
            }

            var somaTitularidades = titularidades.Sum(t => t.Percentual);
            if (somaTitularidades != 100.0000m)
                throw new DomainException($"Soma das titularidades autorais ({somaTitularidades:0.0000}%) deve ser exatamente 100%.");

            foreach (var titularidade in titularidades)
            {
                _obraRepository.Update(obra);
            }

            var fonogramasCriados = new List<Fonograma>();
            var fonogramaParticipacoes = new List<(Fonograma Fonograma, List<ParticipacaoConexa> Participacoes)>();

            foreach (var fonoInput in command.Fonogramas)
            {
                var isrc = Isrc.Create(fonoInput.Isrc);
                var fonograma = Fonograma.Criar(isrc, obra.Id, fonoInput.Pais, fonoInput.DataGravacao, fonoInput.DataLancamento);

                if (!string.IsNullOrWhiteSpace(fonoInput.UrlAudio))
                    fonograma.DefinirUrlAudio(fonoInput.UrlAudio);

                await _fonogramaRepository.AddAsync(fonograma, cancellationToken);

                var participacoes = new List<ParticipacaoConexa>();
                foreach (var p in fonoInput.Participacoes)
                {
                    var titular = titularMap[p.TitularLocalKey];
                    var participacao = ParticipacaoConexa.Criar(fonograma.Id, titular.Id, p.Papel);
                    participacoes.Add(participacao);
                }

                CalculadoraConexos.Calcular(participacoes);
                fonogramasCriados.Add(fonograma);
                fonogramaParticipacoes.Add((fonograma, participacoes));
            }

            if (iswcObtido is not null)
            {
                if (await _obraRepository.ExisteIswcAsync(iswcObtido, cancellationToken))
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    throw new ConflictException("O ISWC retornado já está vinculado a outra obra.");
                }

                var obraBefore = _obraAuditPublisher.Snapshot(obra);
                obra.AtribuirIswc(iswcObtido);
                _obraRepository.Update(obra);
                _outbox.AddEvent("cadastro.obra.liberada", obra.Id.ToString(), new
                {
                    obraId = obra.Id,
                    titulo = obra.Titulo,
                    iswc = obra.Iswc,
                });
                await _obraAuditPublisher.PublishAsync(obra, ObraAuditOperation.ObtainIswc, obraBefore, cancellationToken);

                foreach (var (fonograma, _) in fonogramaParticipacoes)
                {
                    fonograma.TransicionarParaPendenteDocumentacao();
                    if (!string.IsNullOrWhiteSpace(fonograma.UrlAudio))
                    {
                        var fonoBefore = _fonogramaAuditPublisher.Snapshot(fonograma);
                        fonograma.Liberar();
                        _fonogramaRepository.Update(fonograma);
                        _outbox.AddEvent("cadastro.fonograma.liberado", fonograma.Id.ToString(), new
                        {
                            fonogramaId = fonograma.Id,
                            isrc = fonograma.Isrc.Valor,
                            obraId = obra.Id,
                        });
                        await _fonogramaAuditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Release, fonoBefore, cancellationToken);
                    }
                }
            }
            else
            {
                foreach (var (fonograma, _) in fonogramaParticipacoes)
                {
                    fonograma.TransicionarParaPendenteDocumentacao();
                }
            }

            foreach (var titularidade in titularidades)
            {
                await _titularidadeAuditPublisher.PublishAsync(titularidade, TitularidadeAuditOperation.Add, before: null, cancellationToken);
            }

            foreach (var (fonograma, participacoes) in fonogramaParticipacoes)
            {
                await _fonogramaAuditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Create, before: null, cancellationToken);
                foreach (var participacao in participacoes)
                {
                    await _participacaoAuditPublisher.PublishAsync(participacao, ParticipacaoAuditOperation.Add, before: null, cancellationToken);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return BuildResponse(obra, fonogramasCriados, titularesCriados, iswcObtido is not null);
        }
        catch
        {
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(cancellationToken); }
                catch { }
            }
            throw;
        }
        finally
        {
            if (transaction is not null)
                await transaction.DisposeAsync();
        }
    }

    private void ValidarTitularidadesAutorais(
        RegistrarRepertorioCommand command, Dictionary<string, Titular> titularMap)
    {
        var paresVistos = new HashSet<string>();

        foreach (var tid in command.Titularidades)
        {
            if (!titularMap.ContainsKey(tid.TitularLocalKey))
                throw new Cadastro.Application.Common.Exceptions.ValidationException(
                    new Dictionary<string, string[]> { { "Titularidades", [$"Titular com chave local '{tid.TitularLocalKey}' não encontrado."] } });

            var titular = titularMap[tid.TitularLocalKey];

            if (tid.Categoria == CategoriaAutoral.Editor && titular.Tipo != TipoTitular.PJ)
                throw new DomainException("A categoria Editor exige um titular Pessoa Jurídica (PJ).");

            var pair = $"{tid.TitularLocalKey}:{tid.Categoria}";
            if (!paresVistos.Add(pair))
                throw new ConflictException($"O titular '{tid.TitularLocalKey}' já possui a categoria {tid.Categoria} na obra.");
        }
    }

    private void ValidarFonogramasPayload(
        RegistrarRepertorioCommand command, Dictionary<string, Titular> titularMap)
    {
        var isrcsVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var fonoInput in command.Fonogramas)
        {
            var isrc = Isrc.Create(fonoInput.Isrc);
            var isrcValor = isrc.Valor;

            if (!isrcsVistos.Add(isrcValor))
                throw new ConflictException($"ISRC duplicado no payload: {isrc.Formatado}.");
        }

        foreach (var fonoInput in command.Fonogramas)
        {
            var paresVistos = new HashSet<string>();
            foreach (var p in fonoInput.Participacoes)
            {
                if (!titularMap.ContainsKey(p.TitularLocalKey))
                    throw new Cadastro.Application.Common.Exceptions.ValidationException(
                        new Dictionary<string, string[]> { { "Fonogramas", [$"Titular com chave local '{p.TitularLocalKey}' não encontrado."] } });

                var pair = $"{p.TitularLocalKey}:{p.Papel}";
                if (!paresVistos.Add(pair))
                    throw new ConflictException($"O titular '{p.TitularLocalKey}' já possui o papel {p.Papel} no mesmo fonograma.");
            }
        }
    }

    private async Task ValidarIsrcsUnicidadeAsync(
        RegistrarRepertorioCommand command, CancellationToken cancellationToken)
    {
        foreach (var fonoInput in command.Fonogramas)
        {
            var isrc = Isrc.Create(fonoInput.Isrc);
            if (await _fonogramaRepository.ExisteIsrcAsync(isrc.Valor, cancellationToken))
                throw new ConflictException($"Já existe um fonograma com o ISRC {isrc.Formatado}.");
        }
    }

    private async Task<string> ObterIswcAsync(
        RegistrarRepertorioCommand command, Dictionary<string, Titular> titularMap,
        CancellationToken cancellationToken)
    {
        try
        {
            var autores = command.Titularidades
                .Where(t => t.Categoria == CategoriaAutoral.Autor)
                .Select(t => titularMap[t.TitularLocalKey].Nome)
                .Distinct()
                .ToArray();

            var associacaoSigla = await ResolverAssociacaoSiglaAsync(command, titularMap, cancellationToken);

            return await _iswcService.ObterIswcAsync(command.Obra.Titulo, autores, associacaoSigla, cancellationToken);
        }
        catch (RepertorioIswcIndisponivelException)
        {
            throw;
        }
        catch (DomainException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new RepertorioIswcIndisponivelException("Serviço ISWC indisponível.", ex);
        }
    }

    private async Task<string> ResolverAssociacaoSiglaAsync(
        RegistrarRepertorioCommand command, Dictionary<string, Titular> titularMap,
        CancellationToken cancellationToken)
    {
        foreach (var tid in command.Titularidades.Where(t => t.Categoria == CategoriaAutoral.Autor))
        {
            var titular = titularMap[tid.TitularLocalKey];
            if (titular.AssociacaoId != Guid.Empty)
            {
                var associacao = await _associacaoRepository.GetByIdAsync(titular.AssociacaoId, cancellationToken);
                if (associacao?.Sigla is not null)
                    return associacao.Sigla;
            }
        }

        return "UNKNOWN";
    }

    private static CadastroRepertorioResponse BuildResponse(
        ObraMusical obra,
        List<Fonograma> fonogramas,
        List<Titular> titularesCriados,
        bool iswcObtido)
    {
        var statusObra = obra.Status switch
        {
            StatusObra.Liberado => "LIBERADO",
            StatusObra.Pendente => "PENDENTE",
            StatusObra.Bloqueado => "BLOQUEADO",
            StatusObra.DominioPublico => "DOMINIO_PUBLICO",
            StatusObra.Depurada => "DEPURADA",
            _ => obra.Status.ToString().ToUpperInvariant()
        };

        var fonogramaResponses = fonogramas.Select(f => new FonogramaRepertorioResponse(
            f.Id,
            f.Isrc.Formatado,
            f.Status.ToString().ToUpperInvariant(),
            $"/api/v1/fonogramas/{f.Id}"
        )).ToList();

        var titularResponses = titularesCriados.Select(t => new TitularCriadoResponse(
            t.Id,
            t.Nome,
            t.Tipo == TipoTitular.PF ? "PF" : "PJ",
            t.DocumentoFormatado,
            string.Empty
        )).ToList();

        var fonogramaLinks = fonogramas.Select(f => $"/api/v1/fonogramas/{f.Id}").ToList();

        return new CadastroRepertorioResponse(
            ObraId: obra.Id,
            ObraTitulo: obra.Titulo,
            StatusObra: statusObra,
            Iswc: obra.Iswc,
            Fonogramas: fonogramaResponses,
            TitularesCriados: titularResponses,
            IswcObtido: iswcObtido,
            ObraLink: $"/api/v1/obras/{obra.Id}",
            FonogramaLinks: fonogramaLinks
        );
    }
}
