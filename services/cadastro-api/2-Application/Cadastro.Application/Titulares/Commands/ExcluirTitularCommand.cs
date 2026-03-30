using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Command para excluir um titular.
/// Bloqueado com ConflictException se titular tiver vínculos (RF-23).
/// </summary>
public record ExcluirTitularCommand(Guid Id) : ICommand<bool>;
