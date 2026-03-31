using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Titularidades.Commands;

public record RemoverTitularidadeCommand(
    Guid ObraId,
    Guid Id
) : ICommand<TitularidadesResponse>;
