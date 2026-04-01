using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;

namespace Cadastro.Application.Fonogramas.Commands;

public record DepurarFonogramaCommand(
    Guid Id,
    string Isrc,
    string PaisOrigem,
    DateOnly? DataGravacao,
    DateOnly? DataLancamento
) : ICommand<DepuracaoFonogramaResponse>;

public class DepurarFonogramaCommandValidator : AbstractValidator<DepurarFonogramaCommand>
{
    public DepurarFonogramaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("ID do fonograma é obrigatório.");

        RuleFor(x => x.Isrc)
            .NotEmpty().WithMessage("ISRC é obrigatório.")
            .Length(12).WithMessage("ISRC deve ter 12 caracteres (sem hífens).");

        RuleFor(x => x.PaisOrigem)
            .NotEmpty().WithMessage("País de origem é obrigatório.")
            .MaximumLength(100).WithMessage("País de origem deve ter no máximo 100 caracteres.");
    }
}

public class DepurarFonogramaCommandHandler : ICommandHandler<DepurarFonogramaCommand, DepuracaoFonogramaResponse>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IOutboxEventWriter _outbox;

    public DepurarFonogramaCommandHandler(IFonogramaRepository fonogramaRepository, IOutboxEventWriter outbox)
    {
        _fonogramaRepository = fonogramaRepository;
        _outbox = outbox;
    }

    public async Task<DepuracaoFonogramaResponse> HandleAsync(DepurarFonogramaCommand command, CancellationToken cancellationToken)
    {
        var original = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken);
        if (original == null)
            throw new NotFoundException("Fonograma não encontrado.", command.Id);

        var novoIsrc = Isrc.Create(command.Isrc);

        if (original.Status != StatusFonograma.Liberado)
            throw new ConflictException("Apenas fonogramas LIBERADOS podem ser depurados.");

        if (await _fonogramaRepository.ExisteIsrcAsync(novoIsrc.Valor, original.Id, cancellationToken))
            throw new ConflictException($"Já existe um fonograma com o ISRC '{novoIsrc.Formatado}'.");

        var novoFonograma = Fonograma.Criar(
            novoIsrc,
            original.ObraId,
            command.PaisOrigem,
            command.DataGravacao,
            command.DataLancamento
        );

        await _fonogramaRepository.AddAsync(novoFonograma, cancellationToken);

        var isrcOriginal = original.Isrc.Valor;
        original.Depurar(novoFonograma.Id);
        _fonogramaRepository.Update(original);

        // Registrar evento na outbox — mesma transação (RF-17)
        _outbox.AddEvent("cadastro.fonograma.depurado", original.Id.ToString(), new
        {
            fonogramaId = original.Id,
            isrcOriginal,
            novoFonogramaId = novoFonograma.Id,
            obraId = original.ObraId,
        });

        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        var obraStatus = original.Obra.Status == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : original.Obra.Status.ToString().ToUpperInvariant();
        var fStatusOriginal = "DEPURADO";
        var fStatusNovo = novoFonograma.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                          novoFonograma.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                          novoFonograma.Status.ToString().ToUpperInvariant();

        var depuradoResp = new FonogramaResponse(
            original.Id,
            original.Isrc.Valor,
            original.Isrc.Formatado,
            new ObraResumoResponse(original.Obra.Id, original.Obra.Titulo, obraStatus),
            original.PaisOrigem,
            original.DataGravacao,
            original.DataLancamento,
            fStatusOriginal,
            original.FonogramaDepuradoParaId,
            original.CriadoEm,
            original.AtualizadoEm
        );

        var novoResp = new FonogramaResponse(
            novoFonograma.Id,
            novoFonograma.Isrc.Valor,
            novoFonograma.Isrc.Formatado,
            new ObraResumoResponse(original.Obra.Id, original.Obra.Titulo, obraStatus),
            novoFonograma.PaisOrigem,
            novoFonograma.DataGravacao,
            novoFonograma.DataLancamento,
            fStatusNovo,
            novoFonograma.FonogramaDepuradoParaId,
            novoFonograma.CriadoEm,
            novoFonograma.AtualizadoEm
        );

        return new DepuracaoFonogramaResponse(depuradoResp, novoResp);
    }
}
