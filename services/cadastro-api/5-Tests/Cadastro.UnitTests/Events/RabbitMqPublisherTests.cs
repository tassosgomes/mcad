using Cadastro.Infra.Events;
using Microsoft.Extensions.Configuration;

namespace Cadastro.UnitTests.Events;

public class RabbitMqPublisherTests
{
    [Fact]
    public void ResolveRabbitMqUrl_ComUrlExplicita_DevePreservarValor()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RABBITMQ_URL"] = "amqps://user:secret@example.com/vhost"
            })
            .Build();

        var rabbitUrl = RabbitMqPublisher.ResolveRabbitMqUrl(configuration);

        Assert.Equal("amqps://user:secret@example.com/vhost", rabbitUrl);
    }

    [Fact]
    public void ResolveRabbitMqUrl_ComConfiguracaoSeparada_DeveMontarUri()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RABBITMQ_HOST"] = "kebnekaise.lmq.cloudamqp.com",
                ["RABBITMQ_PORT"] = "5671",
                ["RABBITMQ_USER"] = "brhqehoy",
                ["RABBITMQ_PASSWORD"] = "BP3SznplJcc2dlul3thHIflr3HjEoJ26",
                ["RABBITMQ_VHOST"] = "brhqehoy"
            })
            .Build();

        var rabbitUrl = RabbitMqPublisher.ResolveRabbitMqUrl(configuration);

        Assert.Equal(
            "amqps://brhqehoy:BP3SznplJcc2dlul3thHIflr3HjEoJ26@kebnekaise.lmq.cloudamqp.com:5671/brhqehoy",
            rabbitUrl);
    }

    [Fact]
    public void ResolveRabbitMqUrl_SemConfiguracao_DeveUsarFallbackLocal()
    {
        var configuration = new ConfigurationBuilder().Build();

        var rabbitUrl = RabbitMqPublisher.ResolveRabbitMqUrl(configuration);

        Assert.Equal("amqp://guest:guest@localhost:5672", rabbitUrl);
    }
}