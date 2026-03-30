using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Responses;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Command para atualizar dados editáveis do titular.
/// Tipo e Documento são imutáveis e NÃO estão neste command (RF-11).
/// Status pode ser alterado para: Ativo, Falecido, Transferindo (RF-12).
/// </summary>
public record AtualizarTitularCommand(
    Guid Id,
    string Nome,
    string Nacionalidade,
    Guid AssociacaoId,
    string Status,
    string? CaeIpi
) : ICommand<TitularResponse>;
