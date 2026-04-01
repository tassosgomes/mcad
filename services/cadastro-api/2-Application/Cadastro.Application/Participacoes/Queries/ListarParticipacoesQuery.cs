using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Responses;

namespace Cadastro.Application.Participacoes.Queries;

public record ListarParticipacoesQuery(Guid FonogramaId) : IQuery<ParticipacoesResponse>;
