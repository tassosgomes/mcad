using Cadastro.Domain.Enums;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Telefone de titular: junta o VO <see cref="Telefone"/> (número validado) com um <see cref="TipoTelefone"/>.
/// </summary>
public record TelefoneTitular(TipoTelefone Tipo, Telefone Numero);
