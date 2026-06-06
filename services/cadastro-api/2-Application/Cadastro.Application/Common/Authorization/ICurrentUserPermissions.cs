namespace Cadastro.Application.Common.Authorization;

public interface ICurrentUserPermissions
{
    Task<bool> HasAsync(string permission);
}
