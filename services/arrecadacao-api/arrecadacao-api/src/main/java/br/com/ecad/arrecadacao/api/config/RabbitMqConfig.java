package br.com.ecad.arrecadacao.api.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String ARRECADACAO_EVENTS_EXCHANGE = "arrecadacao.events";

    @Bean
    TopicExchange arrecadacaoEventsExchange() {
        return new TopicExchange(ARRECADACAO_EVENTS_EXCHANGE, true, false);
    }

    @Bean
    TopicExchange identityEventsExchange(
            @Value("${app.identity-events.exchange:identity.events}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    Queue identityUsersQueue(
            @Value("${app.identity-events.queue:arrecadacao.identity.users}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    Binding identityUsersBinding(
            @Qualifier("identityUsersQueue") Queue identityUsersQueue,
            @Qualifier("identityEventsExchange") TopicExchange identityEventsExchange,
            @Value("${app.identity-events.routing-key:identity.user.*}") String routingKey) {
        return BindingBuilder.bind(identityUsersQueue).to(identityEventsExchange).with(routingKey);
    }
}
