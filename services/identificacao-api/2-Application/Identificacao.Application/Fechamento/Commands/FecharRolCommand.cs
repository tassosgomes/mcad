using Identificacao.Application.Common;
using Identificacao.Application.Fechamento.Responses;

namespace Identificacao.Application.Fechamento.Commands;

public record FecharRolCommand(Guid CaptacaoId, Guid AnalistaId) : ICommand<FechamentoResponse>;
