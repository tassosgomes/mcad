using Saunter;
using Saunter.AsyncApiSchema.v2;
using Saunter.AsyncApiSchema.v2.Bindings;
using Saunter.AsyncApiSchema.v2.Bindings.Amqp;

namespace Identificacao.API.AsyncApi;

public static class AsyncApiExtensions
{
    public static IServiceCollection AddAsyncApiDocs(this IServiceCollection services)
    {
        services.AddAsyncApiSchemaGeneration(options =>
        {
            options.AssemblyMarkerTypes = new[] { typeof(IdentificacaoChannels) };

            options.Middleware.Route = "/asyncapi/asyncapi.json";
            options.Middleware.UiBaseRoute = "/asyncapi/ui/";
            options.Middleware.UiTitle = "Identificação API — Eventos Assíncronos";

            options.AsyncApi = new AsyncApiDocument
            {
                Info = new Info("Identificação API — Eventos Assíncronos", "1.0.0")
                {
                    Description =
                        "Eventos publicados pelo domínio de **Identificação** via RabbitMQ.\n\n" +
                        "**Formato:** CloudEvents 1.0 (`application/cloudevents+json`)\n\n" +
                        "**Entrega:** at-least-once via Transactional Outbox (`identificacao.outbox_events`)\n\n" +
                        "Os schemas representam o campo `data` do envelope CloudEvents.",
                },
                Servers =
                {
                    ["development"] = new Server("amqp://localhost:5672", "amqp")
                    {
                        Description = "RabbitMQ local — docker-compose.dev.yml (vhost: mcad)",
                    },
                },
                Components = new Components
                {
                    ChannelBindings =
                    {
                        ["amqp"] = new ChannelBindings
                        {
                            Amqp = new AmqpChannelBinding
                            {
                                Is = AmqpChannelBindingIs.RoutingKey,
                                Exchange = new AmqpChannelBindingExchange
                                {
                                    Name = "identificacao.events",
                                    Type = AmqpChannelBindingExchangeType.Topic,
                                    Durable = true,
                                    AutoDelete = false,
                                    VirtualHost = "mcad",
                                },
                            },
                        },
                    },
                },
            };
        });

        return services;
    }

    public static void MapAsyncApiDocs(this WebApplication app)
    {
        app.MapAsyncApiDocuments().AllowAnonymous();
        app.MapAsyncApiUi().AllowAnonymous();
    }
}
