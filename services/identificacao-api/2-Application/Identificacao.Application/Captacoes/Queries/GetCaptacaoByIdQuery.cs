using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;

namespace Identificacao.Application.Captacoes.Queries;

public record GetCaptacaoByIdQuery(Guid Id) : IQuery<CaptacaoDetalheResponse>;
