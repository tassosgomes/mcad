using System.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cadastro.Application.Titulares.Services;
using Cadastro.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace Cadastro.Infra.Services;

/// <summary>
/// Implementação de <see cref="ITitularTokenService"/> que emite JWT HMAC-SHA256
/// para o Portal do Titular.
/// <para>
/// O secret é validado no construtor: deve ter ≥ 32 bytes (UTF-8) para garantir
/// entropia adequada ao HMAC-SHA256.
/// </para>
/// </summary>
public sealed class TitularTokenService : ITitularTokenService
{
    private const string Issuer = "cadastro-api-portal";
    private const int MinSecretBytes = 32;
    private static readonly TimeSpan ExpiraEm = TimeSpan.FromMinutes(60);

    private readonly SymmetricSecurityKey _signingKey;

    public TitularTokenService(string portalJwtSecret)
    {
        if (string.IsNullOrWhiteSpace(portalJwtSecret))
        {
            throw new InvalidOperationException(
                "PORTAL_JWT_SECRET é obrigatório (≥ 32 bytes).");
        }

        var byteCount = Encoding.UTF8.GetByteCount(portalJwtSecret);
        if (byteCount < MinSecretBytes)
        {
            throw new InvalidOperationException(
                $"PORTAL_JWT_SECRET deve ter no mínimo {MinSecretBytes} bytes (atual: {byteCount}).");
        }

        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(portalJwtSecret));
    }

    /// <inheritdoc />
    public string Gerar(Titular titular)
    {
        ArgumentNullException.ThrowIfNull(titular);

        var now = DateTime.UtcNow;
        var expiration = now.Add(ExpiraEm);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, titular.Id.ToString()),
            new("nome", titular.Nome),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: null,
            claims: claims,
            notBefore: now,
            expires: expiration,
            signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
