using System.Security.Claims;
using Identificacao.Domain.Identidade;

namespace Identificacao.API.Infrastructure;

public static class UserContextExtensions
{
    public static Guid GetAnalistaId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("Usuário ausente no token");
        return AnalistaIdentificador.FromSubject(sub);
    }

    public static string GetAnalistaNome(this ClaimsPrincipal user) =>
        user.FindFirst("name")?.Value
        ?? user.FindFirst("username")?.Value
        ?? "Desconhecido";
}
