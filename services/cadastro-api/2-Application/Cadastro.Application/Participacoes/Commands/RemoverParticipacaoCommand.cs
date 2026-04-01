using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Responses;

namespace Cadastro.Application.Participacoes.Commands;

public record RemoverParticipacaoCommand(
    Guid FonogramaId,
    Guid ParticipacaoId
) : ICommand<ParticipacoesResponse>;
