using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de login do titular no Portal (RF-05, RF-06).
/// O handler normaliza o documento, busca a credencial, verifica o hash BCrypt
/// e aplica lockout exponencial após falhas consecutivas (RF-06 / Q-07).
/// </summary>
public record LoginTitularCommand(
    string Documento,
    string Senha) : ICommand<LoginResponse>;
