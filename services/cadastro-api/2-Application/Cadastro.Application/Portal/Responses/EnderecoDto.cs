namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// DTO de endereço para o Portal do Titular (RF-09).
/// Usado tanto como request (entrada do <c>AtualizarContatoCommand</c>) quanto como response
/// (saída do <c>ContatoResponse</c>). <c>Uf</c> é a sigla de 2 letras ("SP", "RJ").
/// </summary>
public record EnderecoDto(
    string Cep,
    string Logradouro,
    string Numero,
    string? Complemento,
    string Bairro,
    string Cidade,
    string Uf);
