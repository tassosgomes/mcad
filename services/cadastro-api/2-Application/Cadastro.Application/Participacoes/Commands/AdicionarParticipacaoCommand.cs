using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Responses;

namespace Cadastro.Application.Participacoes.Commands;

public record AdicionarParticipacaoCommand(
    Guid FonogramaId,
    Guid TitularId,
    string Categoria
) : ICommand<ParticipacoesResponse>;
