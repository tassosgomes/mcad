using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Ecad.Authz.Sdk;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEcadAuthzSdk(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<EcadAuthzOptions>(configuration.GetSection(EcadAuthzOptions.SectionName));

        services
            .AddHttpClient<IEcadAuthzClient, HttpEcadAuthzClient>((serviceProvider, client) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<EcadAuthzOptions>>().Value;
                client.BaseAddress = new Uri(EnsureTrailingSlash(options.BaseUrl));
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            });

        return services;
    }

    private static string EnsureTrailingSlash(string value)
    {
        return value.EndsWith("/", StringComparison.Ordinal) ? value : value + "/";
    }
}
