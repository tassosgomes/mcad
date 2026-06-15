using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de alteração de senha do titular autenticado (RF-07).
/// <c>TitularId</c> vem do <c>ICurrentTitular</c> (extraído do JWT), não do body.
/// Retorna <c>true</c> em sucesso — endpoint responde 204 No Content (mesmo padrão
/// de <c>ExcluirTitularCommand</c>).
/// </summary>
public record AlterarSenhaCommand(
    Guid TitularId,
    string SenhaAtual,
    string NovaSenha) : ICommand<bool>;
