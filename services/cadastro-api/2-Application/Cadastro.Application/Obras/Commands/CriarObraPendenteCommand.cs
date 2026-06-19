using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using FluentValidation;

namespace Cadastro.Application.Obras.Commands;

public record CriarObraPendenteCommand(string Titulo, string TipoObra) : ICommand<ObraResponse>;

public class CriarObraPendenteCommandValidator : AbstractValidator<CriarObraPendenteCommand>
{
    public CriarObraPendenteCommandValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty()
            .WithMessage("Título é obrigatório.")
            .MaximumLength(300);
        RuleFor(x => x.TipoObra)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithMessage("Tipo de obra é obrigatório.")
            .Must(t => TipoObraParser.TryParse(t, out _))
            .WithMessage("Tipo inválido. Valores aceitos: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI");
    }
}

public class CriarObraPendenteCommandHandler : ICommandHandler<CriarObraPendenteCommand, ObraResponse>
{
    private readonly IObraRepository _repository;
    private readonly IObraAuditPublisher _auditPublisher;

    public CriarObraPendenteCommandHandler(IObraRepository repository, IObraAuditPublisher auditPublisher)
    {
        _repository = repository;
        _auditPublisher = auditPublisher;
    }

    public async Task<ObraResponse> HandleAsync(CriarObraPendenteCommand request, CancellationToken cancellationToken)
    {
        var tipo = TipoObraParser.Parse(request.TipoObra);
        var obra = ObraMusical.Criar(request.Titulo, tipo);

        await _repository.AddAsync(obra, cancellationToken);
        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.Create, before: null, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
