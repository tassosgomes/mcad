package br.com.ecad.arrecadacao.api.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String ARRECADACAO_EVENTS_EXCHANGE = "arrecadacao.events";

    @Bean
    TopicExchange arrecadacaoEventsExchange() {
        return new TopicExchange(ARRECADACAO_EVENTS_EXCHANGE, true, false);
    }
}
