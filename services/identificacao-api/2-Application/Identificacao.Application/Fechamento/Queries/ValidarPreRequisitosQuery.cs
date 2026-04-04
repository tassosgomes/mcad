using MediatR;
using Identificacao.Application.Fechamento.Responses;

namespace Identificacao.Application.Fechamento.Queries;

public record ValidarPreRequisitosQuery(Guid CaptacaoId) : IRequest<PreRequisitosResponse>;
