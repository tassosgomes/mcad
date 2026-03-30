using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Responses;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Command para criar um novo titular (PF ou PJ).
/// Tipo "PF" exige documento CPF (11 dígitos numéricos).
/// Tipo "PJ" exige documento CNPJ (14 caracteres alfanuméricos).
/// </summary>
public record CriarTitularCommand(
    string Nome,
    string Tipo,
    string Documento,
    string Nacionalidade,
    Guid AssociacaoId,
    string? CaeIpi
) : ICommand<TitularResponse>;
