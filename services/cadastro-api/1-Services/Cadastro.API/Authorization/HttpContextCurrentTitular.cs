using System.Security.Claims;

namespace Cadastro.API.Authorization;

/// <summary>
/// Implementação de <see cref="ICurrentTitular"/> baseada em <c>HttpContext</c>.
/// Extrai a claim <c>sub</c> do <c>HttpContext.User</c> (scheme "Titular").
/// </summary>
public sealed class HttpContextCurrentTitular(IHttpContextAccessor accessor) : ICurrentTitular
{
    private const string SubjectClaim = "sub";

    public Guid TitularId
    {
        get
        {
            var subject = accessor.HttpContext?.User?.FindFirst(SubjectClaim)?.Value;
            return Guid.TryParse(subject, out var titularId) ? titularId : Guid.Empty;
        }
    }

    public bool IsAutenticado
    {
        get
        {
            var user = accessor.HttpContext?.User;
            return user?.Identity?.IsAuthenticated == true && TitularId != Guid.Empty;
        }
    }
}
