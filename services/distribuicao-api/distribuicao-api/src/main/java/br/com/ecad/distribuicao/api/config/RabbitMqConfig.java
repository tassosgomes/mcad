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

    // ─── F02: Gestão de Processos ───────────────────────────────────────────

    // Exchange da Distribuição — publicação de eventos de ciclo de vida
    @Bean
    public TopicExchange distribuicaoEventsExchange() {
        return ExchangeBuilder.topicExchange("distribuicao.events").durable(true).build();
    }

    // Queues de snapshot — consumo de eventos upstream
    @Bean
    public Queue rolQueue(@Value("${app.rabbitmq.queues.rol:distribuicao.rol}") String rolQueueName) {
        return QueueBuilder.durable(rolQueueName).build();
    }

    @Bean
    public Queue verbaQueue(@Value("${app.rabbitmq.queues.verba:distribuicao.verba}") String verbaQueueName) {
        return QueueBuilder.durable(verbaQueueName).build();
    }

    // Exchange da Identificação — consumo de eventos de Rol
    @Bean
    public TopicExchange identificacaoEventsExchange() {
        return ExchangeBuilder.topicExchange("identificacao.events").durable(true).build();
    }

    // Bindings — Rol (a partir do exchange da Identificação)
    @Bean
    public Binding bindRolFechado(
            @Qualifier("rolQueue") Queue rolQueue,
            @Qualifier("identificacaoEventsExchange") TopicExchange identificacaoEventsExchange) {
        return BindingBuilder.bind(rolQueue).to(identificacaoEventsExchange)
                .with("identificacao.rol.fechado");
    }

    @Bean
    public Binding bindRolCancelado(
            @Qualifier("rolQueue") Queue rolQueue,
            @Qualifier("identificacaoEventsExchange") TopicExchange identificacaoEventsExchange) {
        return BindingBuilder.bind(rolQueue).to(identificacaoEventsExchange)
                .with("identificacao.rol.cancelado");
    }

    // Binding — Verba (a partir do exchange da Arrecadação — já declarado acima)
    @Bean
    public Binding bindVerbaDisponivel(
            @Qualifier("verbaQueue") Queue verbaQueue,
            @Qualifier("arrecadacaoEventsExchange") TopicExchange arrecadacaoEventsExchange) {
        return BindingBuilder.bind(verbaQueue).to(arrecadacaoEventsExchange)
                .with("arrecadacao.verba.disponivel");
    }

    // ─── F06: Ajustes por Estorno ────────────────────────────────────────────

    @Bean
    public Queue pagamentoEstornadoQueue(
            @Value("${app.rabbitmq.queues.estornos:distribuicao.pagamento-estornado}") String queueName) {
        return QueueBuilder.durable(queueName).build();
    }

    @Bean
    public Binding bindPagamentoEstornado(
            @Qualifier("pagamentoEstornadoQueue") Queue pagamentoEstornadoQueue,
            @Qualifier("arrecadacaoEventsExchange") TopicExchange arrecadacaoEventsExchange,
            @Value("${app.rabbitmq.routing-keys.pagamento-estornado:arrecadacao.pagamento.estornado}") String routingKey) {
        return BindingBuilder.bind(pagamentoEstornadoQueue).to(arrecadacaoEventsExchange).with(routingKey);
    }
}
