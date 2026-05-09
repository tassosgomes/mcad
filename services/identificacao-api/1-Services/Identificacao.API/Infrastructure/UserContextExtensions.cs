using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Identificacao.API.Infrastructure;

public static class UserContextExtensions
{
    public static Guid GetAnalistaId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("Usuário ausente no token");

        if (Guid.TryParse(sub, out var guid))
        {
            return guid;
        }

        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(sub));
        return new Guid(bytes);
    }

    public static string GetAnalistaNome(this ClaimsPrincipal user) =>
        user.FindFirst("name")?.Value
        ?? user.FindFirst("username")?.Value
        ?? "Desconhecido";
}
