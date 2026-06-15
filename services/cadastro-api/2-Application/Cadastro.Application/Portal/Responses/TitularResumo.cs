namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Resumo do titular retornado pelo Portal (auto-cadastro e login).
/// Nunca expõe documento (CPF/CNPJ) nem hash de senha (LGPD / RF-04).
/// </summary>
public record TitularResumo(Guid Id, string Nome);
