using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ecad.Authz.AspNetCore;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEcadAuthz(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddEcadAuthzSdk(configuration);
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        return services;
    }
}
