using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Responses;

namespace Cadastro.Application.Participacoes.Commands;

public record CalcularPercentuaisCommand(Guid FonogramaId) : ICommand<ParticipacoesResponse>;
