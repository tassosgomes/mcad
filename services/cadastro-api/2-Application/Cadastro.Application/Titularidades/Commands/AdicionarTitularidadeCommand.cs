using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Titularidades.Commands;

public record AdicionarTitularidadeCommand(
    Guid ObraId,
    Guid TitularId,
    string Categoria,
    decimal Percentual
) : ICommand<TitularidadesResponse>;
