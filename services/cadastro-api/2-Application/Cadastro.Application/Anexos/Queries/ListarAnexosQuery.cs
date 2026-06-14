using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Queries;

public record ListarAnexosQuery(TipoEntidadeAnexo EntidadeTipo, Guid EntidadeId)
    : IQuery<IEnumerable<AnexoResponse>>;
