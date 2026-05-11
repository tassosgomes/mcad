package br.com.ecad.distribuicao.api.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    @Bean
    public Queue rubricasQueue(@Value("${app.rabbitmq.queues.rubricas}") String rubricasQueue) {
        return QueueBuilder.durable(rubricasQueue).build();
    }

    @Bean
    public TopicExchange arrecadacaoEventsExchange(
            @Value("${app.rabbitmq.exchange}") String exchangeName) {
        return ExchangeBuilder.topicExchange(exchangeName).durable(true).build();
    }

    @Bean
    public Binding rubricaCriadaBinding(
            @Qualifier("rubricasQueue") Queue rubricasQueue,
            @Qualifier("arrecadacaoEventsExchange") TopicExchange arrecadacaoEventsExchange,
            @Value("${app.rabbitmq.routing-keys.rubrica-criada}") String routingKey) {
        return BindingBuilder.bind(rubricasQueue).to(arrecadacaoEventsExchange).with(routingKey);
    }

    @Bean
    public Binding rubricaAtualizadaBinding(
            @Qualifier("rubricasQueue") Queue rubricasQueue,
            @Qualifier("arrecadacaoEventsExchange") TopicExchange arrecadacaoEventsExchange,
            @Value("${app.rabbitmq.routing-keys.rubrica-atualizada}") String routingKey) {
        return BindingBuilder.bind(rubricasQueue).to(arrecadacaoEventsExchange).with(routingKey);
    }

    @Bean
    public Queue identityUsersQueue(
            @Value("${app.identity-events.queue}") String identityUsersQueue) {
        return QueueBuilder.durable(identityUsersQueue).build();
    }

    @Bean
    public TopicExchange identityEventsExchange(
            @Value("${app.identity-events.exchange}") String exchangeName) {
        return ExchangeBuilder.topicExchange(exchangeName).durable(true).build();
    }

    @Bean
    public Binding identityUsersBinding(
            @Qualifier("identityUsersQueue") Queue identityUsersQueue,
            @Qualifier("identityEventsExchange") TopicExchange identityEventsExchange,
            @Value("${app.identity-events.routing-key}") String routingKey) {
        return BindingBuilder.bind(identityUsersQueue).to(identityEventsExchange).with(routingKey);
    }
}
