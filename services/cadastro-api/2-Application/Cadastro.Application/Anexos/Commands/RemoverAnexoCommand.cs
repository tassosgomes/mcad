using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Commands;

public record RemoverAnexoCommand(
    TipoEntidadeAnexo EntidadeTipo,
    Guid EntidadeId,
    Guid AnexoId
) : ICommand<bool>;
