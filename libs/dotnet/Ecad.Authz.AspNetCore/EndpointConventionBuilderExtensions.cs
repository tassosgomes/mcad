using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;

namespace Ecad.Authz.AspNetCore;

public static class EndpointConventionBuilderExtensions
{
    public static TBuilder RequirePermission<TBuilder>(
        this TBuilder builder,
        string permission)
        where TBuilder : IEndpointConventionBuilder
    {
        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(permission))
            .Build();

        builder.RequireAuthorization(policy);
        return builder;
    }
}
