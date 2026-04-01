using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Responses;

namespace Cadastro.Application.Participacoes.Commands;

public record AjustarPercentualCommand(
    Guid FonogramaId,
    Guid ParticipacaoId,
    decimal Percentual
) : ICommand<ParticipacoesResponse>;
