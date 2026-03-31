using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Titularidades.Commands;

public record EditarTitularidadeCommand(
    Guid ObraId,
    Guid Id,
    decimal Percentual
) : ICommand<TitularidadesResponse>;
