using Cadastro.Domain.Entities;

namespace Cadastro.Application.Titulares.Services;

/// <summary>
/// Serviço de emissão de credencial de sessão (JWT HMAC-SHA256) do Portal do Titular.
/// Token com <c>sub = titular.Id</c>, claim <c>nome</c>, expira em 60 minutos.
/// Assinado com <c>PORTAL_JWT_SECRET</c> (≥ 32 bytes).
/// </summary>
public interface ITitularTokenService
{
    /// <summary>
    /// Gera um JWT de acesso para o titular informado.
    /// </summary>
    string Gerar(Titular titular);
}
